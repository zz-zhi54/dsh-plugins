// Host 半的回归测试。
//
// 重点是 credentials 的解析分支：Cordis 的 `ctx.get(name)` 默认 strict，
// 提供方 fiber 未 active 时返回 undefined。历史 bug 就是在 apply() 时解析一次并
// 缓存，于是永久拿到 undefined；这里把三种解析结果固定下来，防止回归。

import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveCredentials } from '../src/host.mjs'

const SERVICE = { readRecord: async () => undefined }

/** 造一个只认识 credentials 两个读取模式的假 ctx。 */
const ctxStub = ({ strict, lenient } = {}) => ({
  get(name, requireActive = true) {
    assert.equal(name, 'credentials')
    return requireActive ? strict : lenient
  },
})

test('服务已就绪时返回服务实例', () => {
  const resolved = resolveCredentials(ctxStub({ strict: SERVICE, lenient: SERVICE }))
  assert.equal(resolved.credentials, SERVICE)
  assert.equal(resolved.reason, undefined)
})

test('已挂载但尚未就绪时给出可重试的原因，而不是"没有挂载"', () => {
  // 这就是踩过的坑：apply 阶段 strict 取不到，但服务其实已经提供
  const resolved = resolveCredentials(ctxStub({ strict: undefined, lenient: SERVICE }))
  assert.equal(resolved.credentials, undefined)
  assert.match(resolved.reason, /尚未就绪/)
})

test('确实没有挂载时给出明确原因', () => {
  const resolved = resolveCredentials(ctxStub({ strict: undefined, lenient: undefined }))
  assert.equal(resolved.credentials, undefined)
  assert.match(resolved.reason, /没有挂载 credentials 服务/)
})

test('查询时必须按次解析，不得在模块加载时缓存服务引用', async () => {
  // 两次解析之间服务从"未就绪"变为"就绪"，模拟真实的时间差
  let ready = false
  const ctx = {
    get(name, requireActive = true) {
      assert.equal(name, 'credentials')
      if (!ready) return requireActive ? undefined : SERVICE
      return SERVICE
    },
  }
  assert.equal(resolveCredentials(ctx).credentials, undefined)
  ready = true
  assert.equal(resolveCredentials(ctx).credentials, SERVICE)
})
