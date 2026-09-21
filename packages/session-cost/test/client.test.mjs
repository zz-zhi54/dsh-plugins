import assert from 'node:assert/strict'
import test from 'node:test'

let captured

globalThis.window = {
  __ModuleLoader__: {
    load: definition => {
      captured = definition
    }
  }
}

await import('../src/client.js')

const hooks = {
  values: [],
  refs: [],
  effects: [],
  call: 0,
  refCall: 0,
  reset() {
    this.call = 0
    this.refCall = 0
    this.effects = []
  },
}

const react = {
  createElement(type, props, ...children) {
    const element = { type, props: props ?? {}, children }
    if (props?.ref && typeof props.ref === 'object') props.ref.current = element
    element.contains = target => target === element
    return element
  },
  useState(initial) {
    const index = hooks.call++
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial
    return [hooks.values[index], next => {
      hooks.values[index] = typeof next === 'function' ? next(hooks.values[index]) : next
    }]
  },
  useRef(initial) {
    const index = hooks.refCall++
    if (!(index in hooks.refs)) hooks.refs[index] = { current: initial }
    return hooks.refs[index]
  },
  useEffect(effect) {
    hooks.effects.push(effect)
  },
}

const module = captured.factory(name => {
  assert.equal(name, 'react')
  return react
})

function register() {
  const registrations = []
  module.apply({
    slots: {
      inject(name, callback) {
        assert.equal(name, 'conversation.composer.dock')
        callback()
      },
      register(options, component) {
        registrations.push({ options, component })
      }
    }
  })
  assert.equal(registrations.length, 1)
  return registrations[0]
}

test('keeps the built-in stats slot and registers an independent cost slot', () => {
  assert.equal(captured.id, 'dsh-session-cost-plugin')
  assert.deepEqual(module.inject, ['slots'])

  const entry = register()
  assert.deepEqual(entry.options, {
    name: 'conversation.composer.dock',
    id: 'session-cost',
    order: 10
  })
  assert.equal(typeof entry.component, 'function')
})

test('closes the open cost dialog on an outside pointerdown', () => {
  const previousDocument = globalThis.document
  let outsidePointerdown
  globalThis.document = {
    addEventListener(type, listener) {
      if (type === 'pointerdown') outsidePointerdown = listener
    },
    removeEventListener() {},
  }

  try {
    hooks.values = [{
      phase: 'ready',
      value: {
        requests: 1,
        cost: 0.0124,
        currency: 'USD',
        pricing: 'full',
        groups: [],
      },
    }, false, null, false]
    hooks.refs = []
    hooks.reset()

    const entry = register()
    const props = {
      sessionId: 'session-1',
      useProjection: () => ({
        uncachedInputTokens: 1,
        outputTokens: 1,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }),
    }

    const render = () => {
      hooks.reset()
      const component = entry.component(props)
      return component.type(component.props)
    }

    let tree = render()
    const trigger = tree.children[0].children[0]
    trigger.props.onClick()
    assert.equal(hooks.values[1], true)

    tree = render()
    assert.equal(typeof tree.children[1].type, 'function')
    const outsideEffect = hooks.effects.at(-1)
    outsideEffect()
    assert.equal(typeof outsidePointerdown, 'function')

    outsidePointerdown({ target: {} })
    assert.equal(hooks.values[1], false)
  } finally {
    if (previousDocument === undefined) delete globalThis.document
    else globalThis.document = previousDocument
  }
})
