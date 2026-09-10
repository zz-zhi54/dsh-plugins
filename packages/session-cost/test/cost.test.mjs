import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateSessionCost, normalizeUsage } from '../src/cost.mjs'
import { readSessionCost } from '../src/host.mjs'

const model = {
  cost: {
    input: 1,
    output: 2,
    cacheRead: 3,
    cacheWrite: 4
  }
}

const resolveModel = (provider, modelId) => provider === 'acme' && modelId === 'model-a' ? model : undefined

function usage(inputTokens, outputTokens, extra = {}) {
  return { inputTokens, outputTokens, ...extra }
}

test('normalizes disjoint provider usage buckets', () => {
  assert.deepEqual(normalizeUsage(usage(10, 20, { cacheReadTokens: 3, cacheWriteTokens: 4 })), {
    inputTokens: 10,
    outputTokens: 20,
    cacheReadTokens: 3,
    cacheWriteTokens: 4,
    totalTokens: 37
  })
  assert.equal(normalizeUsage({ inputTokens: -1, outputTokens: 2 }), null)
})

test('prices assistant messages and failed attempts once per durable event', () => {
  const result = calculateSessionCost([
    {
      type: 'request/header',
      data: { header: { config: { provider: 'acme', model: 'model-a' } } }
    },
    {
      type: 'assistant/attempt',
      data: {
        stream: [
          { type: 'chunk', chunk: { type: 'usage', usage: usage(100, 50) } },
          { type: 'chunk', chunk: { type: 'usage', usage: usage(120, 60, { cacheReadTokens: 10 }) } }
        ]
      }
    },
    {
      type: 'assistant/message',
      data: {
        message: { source: { kind: 'model', provider: 'acme', model: 'model-a' } },
        usage: usage(200, 80, { cacheWriteTokens: 20 })
      }
    },
    {
      type: 'assistant/message',
      data: {
        message: { source: { kind: 'model', provider: 'other', model: 'unknown-model' } },
        usage: usage(10, 10)
      }
    }
  ], { resolveModel })

  assert.equal(result.requests, 3)
  assert.equal(result.pricing, 'partial')
  assert.equal(result.tokens.totalTokens, 510)
  assert.equal(result.groups[0].key, 'acme/model-a')
  assert.equal(result.groups[0].requests, 2)
  assert.equal(result.groups[0].tokens.totalTokens, 490)
  assert.equal(result.groups[0].pricing, 'known')
  assert.ok(result.groups[0].cost > 0)
  assert.equal(result.groups[1].key, 'other/unknown-model')
  assert.equal(result.groups[1].cost, null)
  assert.equal(result.groups[1].pricing, 'unknown')
})

test('reads the current durable session snapshot without retaining it', () => {
  const events = []
  const session = {
    snapshotEvents: () => events,
    seq: 1
  }
  const sessions = { get: id => id === 'session-1' ? session : undefined }

  assert.deepEqual(readSessionCost(sessions, { sessionId: 'missing' }), {
    ok: false,
    reason: 'session-not-found'
  })
  const result = readSessionCost(sessions, { sessionId: 'session-1' })
  assert.equal(result.ok, true)
  assert.equal(result.requests, 0)
})
