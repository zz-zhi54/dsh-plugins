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

const react = {
  createElement: () => null
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
