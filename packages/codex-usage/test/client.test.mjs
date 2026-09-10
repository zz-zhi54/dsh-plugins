// client.js 的契约测试。
//
// client.js 是 DSH Web 的 classic-script 模块（`window.__ModuleLoader__.load`），
// 这里用最小替身模拟 window 与 react，锁住三件容易改坏的事：
// 1. classic-script 工厂形状与 Slot 注册参数；
// 2. 收起态就是全部信息 —— 只显示剩余与刷新倒计时，不显示"已用"，没有悬浮面板；
// 3. 失败态给出带原因的灰色提示。

import assert from 'node:assert/strict'
import test from 'node:test'

/** 收集整棵替身元素树里的文本。 */
function textOf(node) {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return (node.children ?? []).map(textOf).join('')
}

/** 替身 react：createElement 造普通对象，useState 行为可切换，useEffect 不执行。 */
function createReact() {
  const hooks = { result: [{ phase: 'loading' }, () => undefined] }
  let call = 0
  return {
    hooks,
    set(result) {
      hooks.result = result
    },
    reset() {
      call = 0
    },
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    // 按调用次序返回：第一次 useState 是组件状态，其余是 hover / tick
    useState: () => {
      const value = call === 0 ? hooks.result : [undefined, () => undefined]
      call += 1
      return value
    },
    useEffect: () => undefined,
  }
}

const React = createReact()

let captured = null
globalThis.window = { __ModuleLoader__: { load: definition => { captured = definition } } }
await import('../src/client.js')

const module = captured.factory(name => {
  assert.equal(name, 'react')
  return React
})

const timer = { interval: () => () => undefined }

/** 注册一次并返回 Slot 注册参数与渲染入口。 */
function mounted() {
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
      React.reset()
      const element = entry.component()
      return element.type(element.props)
    },
  }
}

test('保持 classic-script 工厂与 Slot 注册契约', () => {
  assert.equal(captured.id, 'dsh-codex-usage-plugin')
  assert.deepEqual(module.inject, ['slots', 'timer'])
  assert.equal(typeof module.apply, 'function')
  assert.deepEqual(mounted().options, {
    name: 'conversation.composer.dock',
    id: 'codex-usage',
    order: 1,
  })
})

test('收起态只显示剩余与刷新倒计时，且没有悬浮面板', () => {
  const now = Math.floor(Date.now() / 1000)
  React.set([{
    phase: 'ready',
    usage: {
      primary: { usedPercent: 7, windowMinutes: 300, resetsAt: now + 3600 * 2 },
      secondary: { usedPercent: 34, windowMinutes: 10080, resetsAt: now + 3600 * 50 },
      planType: 'plus',
      fetchedAt: Date.now(),
    },
  }, () => undefined])

  const tree = mounted().render()
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

test('失败态给出带原因的灰色提示', () => {
  React.set([{ phase: 'error', reason: 'credentials 服务尚未就绪，请稍后刷新' }, () => undefined])

  const tree = mounted().render()
  const text = textOf(tree)

  assert.match(text, /Codex 额度不可用/)
  assert.equal(tree.children[0].props.title, 'credentials 服务尚未就绪，请稍后刷新')
})
