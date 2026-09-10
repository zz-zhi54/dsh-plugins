// client.js 的契约测试。
//
// client.js 是 DSH Web 的 classic-script 模块（`window.__ModuleLoader__.load`），
// 这里用最小替身模拟 window / react / fetch / timer，锁住四件容易改坏的事：
// 1. classic-script 工厂形状与 Slot 注册参数；
// 2. 收起态就是全部信息 —— 只显示剩余与刷新倒计时，不显示"已用"，没有悬浮面板；
// 3. 失败态是可点击的重试按钮（不是点不动的纯文本）；
// 4. 连续失败达到上限后停止自动轮询，只等用户点击重试。

import assert from 'node:assert/strict'
import test from 'node:test'

/** 让在途的 promise 链跑完。 */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

/** 收集整棵替身元素树里的文本。 */
function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return (node.children ?? []).map(textOf).join('')
}

/** 替身 react：useState 按 hook 次序取初值并记录 setter，useEffect 只捕获不执行。 */
function createReact() {
  const hooks = { values: {}, setters: [], effects: [] }
  let call = 0
  return {
    hooks,
    /** 指定某个 hook 次序上的初值（0=state, 1=paused, 2=hover, 3=tick）。 */
    set(index, value) {
      hooks.values[index] = value
    },
    reset() {
      call = 0
      hooks.values = {}
      hooks.setters = []
      hooks.effects = []
    },
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: initial => {
      const index = call
      call += 1
      const value = index in hooks.values ? hooks.values[index] : initial
      return [value, next => { hooks.setters.push({ index, value: next }) }]
    },
    useEffect: effect => { hooks.effects.push(effect) },
  }
}

/** 替身 timer：记录每次 interval 的回调与 disposer 调用次数。 */
function createTimer() {
  const state = { intervals: [], disposed: 0 }
  return {
    state,
    interval(callback, delay) {
      state.intervals.push({ callback, delay })
      return () => { state.disposed += 1 }
    },
  }
}

/** 替换全局 fetch，返回记录到的请求 URL。 */
function stubFetch(payload) {
  const calls = []
  globalThis.fetch = async url => {
    calls.push(url)
    return { json: async () => payload }
  }
  return calls
}

const React = createReact()

let captured = null
globalThis.window = { __ModuleLoader__: { load: definition => { captured = definition } } }
await import('../src/client.js')

const module = captured.factory(name => {
  assert.equal(name, 'react')
  return React
})

/** 注册一次并返回 Slot 注册参数与渲染入口。 */
function mounted(timer) {
  const registrations = []
  module.apply({
    slots: {
      inject(key, callback) {
        assert.equal(key, 'conversation.composer.dock')
        callback()
      },
      register(options, component) {
        registrations.push({ options, component })
      },
    },
    timer,
  })
  assert.equal(registrations.length, 1)
  const entry = registrations[0]
  return {
    options: entry.options,
    render() {
      const element = entry.component()
      return element.type(element.props)
    },
  }
}

/** 渲染一次并返回元素树；调用方负责先 reset + set 初值。 */
function render(timer) {
  const element = mounted(timer)
  return { view: element, tree: element.render() }
}

test('保持 classic-script 工厂与 Slot 注册契约', () => {
  assert.equal(captured.id, 'dsh-codex-usage-plugin')
  assert.deepEqual(module.inject, ['slots', 'timer'])
  assert.equal(typeof module.apply, 'function')
  assert.deepEqual(mounted(createTimer()).options, {
    name: 'conversation.composer.dock',
    id: 'codex-usage',
    order: 1,
  })
})

test('收起态只显示剩余与刷新倒计时，且没有悬浮面板', () => {
  const now = Math.floor(Date.now() / 1000)
  React.reset()
  React.set(0, {
    phase: 'ready',
    usage: {
      primary: { usedPercent: 7, windowMinutes: 300, resetsAt: now + 3600 * 2 },
      secondary: { usedPercent: 34, windowMinutes: 10080, resetsAt: now + 3600 * 50 },
      planType: 'plus',
      fetchedAt: Date.now(),
    },
  })

  const { tree } = render(createTimer())
  const text = textOf(tree)

  assert.match(text, /^Codex/)
  assert.match(text, /5h/)
  assert.match(text, /剩 93%/)
  assert.match(text, /周/)
  assert.match(text, /剩 66%/)
  assert.match(text, /后刷新/)
  // 不再出现"已用"
  assert.equal(text.includes('用 7%'), false)
  assert.equal(text.includes('已用'), false)
  // 没有悬浮面板：根节点下只有那一个按钮
  assert.equal(tree.children.length, 1)
  assert.equal(tree.children[0].type, 'button')
})

test('失败态是可点击的重试按钮，点击走强制刷新', async () => {
  const timer = createTimer()
  const calls = stubFetch({ ok: false, reason: 'credentials 服务尚未就绪，请稍后刷新' })
  React.reset()
  React.set(0, { phase: 'error', reason: 'credentials 服务尚未就绪，请稍后刷新' })
  React.set(1, true)

  const { tree } = render(timer)
  const text = textOf(tree)

  assert.match(text, /已暂停/)
  assert.match(text, /点击重试/)
  assert.equal(tree.children[0].type, 'button')
  assert.equal(tree.children[0].props.title, 'credentials 服务尚未就绪，请稍后刷新')

  tree.children[0].props.onClick()
  await flush()
  assert.deepEqual(calls, ['/api/codex-usage?force=1'])
})

test('连续失败达到上限后停止轮询，等用户点击重试', async () => {
  const timer = createTimer()
  const calls = stubFetch({ ok: false, reason: '上游不可用' })
  React.reset()
  React.set(0, { phase: 'loading' })

  const { view } = render(timer)
  // 运行轮询 effect：立刻尝试一次，并注册每 5 分钟的 interval
  const cleanup = React.hooks.effects[0]()
  await flush()
  assert.equal(calls.length, 1)
  assert.equal(timer.state.intervals.length, 1)
  assert.equal(timer.state.intervals[0].delay, 300000)

  const poll = timer.state.intervals[0].callback
  poll()
  await flush()
  poll()
  await flush()

  // 第 3 次失败后请求暂停；真实 React 会因此清理本 effect，轮询随之停止
  assert.deepEqual(
    React.hooks.setters.filter(setter => setter.index === 1),
    [{ index: 1, value: true }],
  )
  cleanup()
  assert.equal(timer.state.disposed, 1)

  // 模拟 React 在 paused=true 后重跑 effect：应当直接返回，不再注册新的轮询
  React.reset()
  React.set(1, true)
  view.render()
  assert.equal(React.hooks.effects[0](), undefined)
  assert.equal(timer.state.intervals.length, 1)
})

test('重试成功后恢复自动轮询', async () => {
  const timer = createTimer()
  stubFetch({
    ok: true,
    usage: { primary: { usedPercent: 10, windowMinutes: 300, resetsAt: 1 }, secondary: null, planType: 'plus', fetchedAt: 1 },
  })
  React.reset()
  React.set(0, { phase: 'error', reason: '上游不可用' })
  React.set(1, true)

  const { tree } = render(timer)
  tree.children[0].props.onClick()
  await flush()

  assert.deepEqual(
    React.hooks.setters.filter(setter => setter.index === 1),
    [{ index: 1, value: false }],
  )
})
