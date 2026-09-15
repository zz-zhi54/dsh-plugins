import test from 'node:test'
import assert from 'node:assert/strict'

import { sessionCostProjectionDefinition } from '../src/projection.mjs'

test('folds usage into a schema-valid host-only projection state', () => {
  let state = sessionCostProjectionDefinition.init()
  state = sessionCostProjectionDefinition.apply(state, {
    type: 'request/header',
    data: { header: { config: { provider: 'acme', model: 'model-a' } } }
  })
  state = sessionCostProjectionDefinition.apply(state, {
    type: 'assistant/attempt',
    data: {
      stream: [
        { chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } } }
      ]
    }
  })

  assert.equal(state.currentRoute.provider, 'acme')
  assert.equal(state.groups['acme/model-a'].requests, 1)
  assert.equal(state.groups['acme/model-a'].tokens.totalTokens, 15)
  assert.doesNotThrow(() => sessionCostProjectionDefinition.stateSchema.parse(state))
})
