// Codex 额度查询的单元测试。
//
// 重点覆盖两类行为：
// 1. 投影与归一化：字段名对齐 pi 插件，且原始响应里的身份信息绝不外泄。
// 2. 安全边界：access token 只允许出现在发往上游的请求头里，绝不进入返回值或错误原因。

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CREDENTIAL_KEY,
  USAGE_ENDPOINT,
  buildCodexUsageHeaders,
  codexUserAgent,
  normalizeWindow,
  projectUsagePayload,
  queryCodexUsage,
  readCodexCredential,
  redact,
} from '../src/codex-usage.mjs'

/** 与真实 wham/usage 响应同形的样例（含必须被丢弃的身份字段）。 */
const ACCESS_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.payload.signature'
const WHAM_PAYLOAD = {
  user_id: 'user-9rZqE7nQmip1J3UyRaZZ97ba',
  account_id: '82c43a50-8646-4b9d-bea2-786feaafa07f',
  email: 'someone@example.com',
  plan_type: 'plus',
  rate_limit: {
    allowed: true,
    limit_reached: false,
    primary_window: { used_percent: 7, limit_window_seconds: 18000, reset_after_seconds: 12943, reset_at: 1789043406 },
    secondary_window: { used_percent: 34, limit_window_seconds: 604800, reset_after_seconds: 426448, reset_at: 1789456910 },
  },
  rate_limit_reset_credits: { available_count: 3, applicable_available_count: 0 },
}

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => body,
})

/** 造一份可用的凭据服务。 */
const credentialsStub = (record = {
  kind: 'grant',
  payload: {
    type: 'oauth',
    access: ACCESS_TOKEN,
    refresh: 'refresh-token-value',
    expires: 1789_999_999_000,
    accountId: '82c43a50-8646-4b9d-bea2-786feaafa07f',
  },
}) => ({ readRecord: async key => (key === CREDENTIAL_KEY ? record : undefined) })

test('codexUserAgent 与 pi-ai 的形状一致', () => {
  assert.match(codexUserAgent(), /^pi \([a-z0-9]+ [^;]+; [a-z0-9_]+\)$/)
})

test('请求头字段与 pi-ai 的 buildBaseCodexHeaders 对齐', () => {
  const headers = buildCodexUsageHeaders('tok', 'acct', 'pi (test 1.0; x64)')
  assert.deepEqual(headers, {
    authorization: 'Bearer tok',
    originator: 'pi',
    'user-agent': 'pi (test 1.0; x64)',
    accept: 'application/json',
    'chatgpt-account-id': 'acct',
  })
})

test('没有 accountId 时不发送 chatgpt-account-id', () => {
  const headers = buildCodexUsageHeaders('tok', undefined, 'ua')
  assert.equal('chatgpt-account-id' in headers, false)
})

test('redact 抹掉 Bearer 与 JSON 里的 token 字段', () => {
  const text = 'failed: Bearer abc.def-ghi and {"access_token":"secret","refresh":"r"}'
  const safe = redact(text)
  assert.equal(safe.includes('abc.def-ghi'), false)
  assert.equal(safe.includes('secret'), false)
  assert.match(safe, /Bearer <redacted>/)
  assert.match(safe, /"access_token":"<redacted>"/)
})

test('redact 抹掉 wham/usage 身份字段与裸邮箱', () => {
  const text = JSON.stringify({
    email: 'someone@example.com',
    user_id: 'user-abc',
    account_id: 'acct-1',
    chatgpt_account_id: 'acct-2',
    note: 'reach me at other@example.org',
    error: 'token_expired',
  })
  const safe = redact(text)

  assert.equal(safe.includes('someone@example.com'), false)
  assert.equal(safe.includes('other@example.org'), false)
  assert.equal(safe.includes('user-abc'), false)
  assert.equal(safe.includes('acct-1'), false)
  assert.equal(safe.includes('acct-2'), false)
  // 诊断信息要保留，否则排障没有线索
  assert.match(safe, /token_expired/)
  assert.match(safe, /"email":"<redacted>"/)
})

test('normalizeWindow 换算分钟、保留秒级 resetsAt、并夹紧百分比', () => {
  assert.deepEqual(normalizeWindow(WHAM_PAYLOAD.rate_limit.primary_window), {
    usedPercent: 7,
    windowMinutes: 300,
    resetsAt: 1789043406,
  })
  assert.equal(normalizeWindow({ used_percent: 140 }).usedPercent, 100)
  assert.equal(normalizeWindow({ used_percent: -5 }).usedPercent, 0)
  assert.equal(normalizeWindow({}), null)
  assert.equal(normalizeWindow(null), null)
})

test('projectUsagePayload 只输出额度标量', () => {
  const usage = projectUsagePayload(WHAM_PAYLOAD, 111)
  assert.deepEqual(usage, {
    primary: { usedPercent: 7, windowMinutes: 300, resetsAt: 1789043406 },
    secondary: { usedPercent: 34, windowMinutes: 10080, resetsAt: 1789456910 },
    planType: 'plus',
    fetchedAt: 111,
  })

  // 身份信息必须留在 Host 内
  const serialized = JSON.stringify(usage)
  assert.equal(serialized.includes('someone@example.com'), false)
  assert.equal(serialized.includes('user-9rZqE7nQmip1J3UyRaZZ97ba'), false)
  assert.equal(serialized.includes('82c43a50'), false)
})

test('projectUsagePayload 在两个窗口都缺失时返回 null', () => {
  assert.equal(projectUsagePayload({ plan_type: 'plus', rate_limit: {} }, 1), null)
  assert.equal(projectUsagePayload({}, 1), null)
  assert.equal(projectUsagePayload(null, 1), null)
})

test('readCodexCredential 读取 grant 记录的关键字段', async () => {
  const credential = await readCodexCredential(credentialsStub())
  assert.equal(credential.access, ACCESS_TOKEN)
  assert.equal(credential.accountId, '82c43a50-8646-4b9d-bea2-786feaafa07f')
  assert.equal(credential.expiresAt, 1789_999_999_000)
  // 不返回 refresh token：本插件绝不刷新凭据，避免与 pi-ai 并发轮换
  assert.equal('refresh' in credential, false)
})

test('readCodexCredential 对缺失与异常记录给出明确错误', async () => {
  await assert.rejects(() => readCodexCredential(undefined), /credentials/)
  await assert.rejects(() => readCodexCredential({ readRecord: async () => undefined }), /没有 Codex 登录凭据/)
  await assert.rejects(
    () => readCodexCredential({ readRecord: async () => ({ kind: 'api-key', key: 'k' }) }),
    /不是 grant/,
  )
  await assert.rejects(
    () => readCodexCredential({ readRecord: async () => ({ kind: 'grant', payload: {} }) }),
    /没有 access token/,
  )
})

test('queryCodexUsage 正常路径：请求头带凭据，返回值不带凭据', async () => {
  const calls = []
  const result = await queryCodexUsage({
    credentials: credentialsStub(),
    now: () => 1234,
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return jsonResponse(JSON.stringify(WHAM_PAYLOAD))
    },
  })

  assert.equal(result.ok, true)
  assert.deepEqual(result.usage.primary, { usedPercent: 7, windowMinutes: 300, resetsAt: 1789043406 })
  assert.equal(result.usage.fetchedAt, 1234)

  // token 只能出现在发往上游的请求头里
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, USAGE_ENDPOINT)
  assert.equal(calls[0].init.headers.authorization, `Bearer ${ACCESS_TOKEN}`)
  assert.equal(calls[0].init.method, 'GET')

  // 返回值里不允许出现 token 或任何身份信息
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes(ACCESS_TOKEN), false)
  assert.equal(serialized.includes('someone@example.com'), false)
})

test('queryCodexUsage 凭据过期时根本不发请求', async () => {
  let called = 0
  const result = await queryCodexUsage({
    credentials: credentialsStub({
      kind: 'grant',
      payload: { access: ACCESS_TOKEN, expires: 1000 },
    }),
    now: () => 2000,
    fetchImpl: async () => {
      called += 1
      return jsonResponse('{}')
    },
  })

  assert.equal(result.ok, false)
  assert.match(result.reason, /已过期/)
  assert.equal(called, 0)
})

test('queryCodexUsage 上游错误：原因已脱敏且不含凭据', async () => {
  const result = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => jsonResponse('{"error":{"message":"bad"},"access_token":"' + ACCESS_TOKEN + '"}', 401),
  })

  assert.equal(result.ok, false)
  assert.match(result.reason, /HTTP 401/)
  assert.equal(result.reason.includes(ACCESS_TOKEN), false)
  assert.equal(result.reason.includes('<redacted>'), true)
})

test('queryCodexUsage 非 JSON 响应与缺少窗口都归为失败', async () => {
  const html = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => jsonResponse('<html>nope</html>'),
  })
  assert.equal(html.ok, false)
  assert.match(html.reason, /不是 JSON/)

  const empty = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => jsonResponse(JSON.stringify({ plan_type: 'plus', rate_limit: {} })),
  })
  assert.equal(empty.ok, false)
  assert.match(empty.reason, /没有额度窗口/)
})

test('queryCodexUsage 捕获异常并脱敏', async () => {
  const result = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => {
      throw new Error(`connect failed with Bearer ${ACCESS_TOKEN}`)
    },
  })

  assert.equal(result.ok, false)
  assert.equal(result.reason.includes(ACCESS_TOKEN), false)
})

// 回归：失败原因会显示在界面上，绝不能把上游的身份字段带出去
test('失败原因不含上游的 email / user_id / account_id', async () => {
  const body = JSON.stringify({
    email: 'someone@example.com',
    user_id: 'user-9rZqE7nQmip1J3UyRaZZ97ba',
    account_id: '82c43a50-8646-4b9d-bea2-786feaafa07f',
    plan_type: 'plus',
  })
  const result = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => jsonResponse(body),
  })

  assert.equal(result.ok, false)
  for (const secret of ['someone@example.com', 'user-9rZqE7nQmip1J3UyRaZZ97ba', '82c43a50-8646-4b9d-bea2-786feaafa07f']) {
    assert.equal(result.reason.includes(secret), false, `原因里泄漏了 ${secret}`)
  }
})

test('非 2xx 的原因同样不含身份字段，但保留诊断信息', async () => {
  const result = await queryCodexUsage({
    credentials: credentialsStub(),
    fetchImpl: async () => jsonResponse('{"email":"someone@example.com","error":{"code":"token_expired"}}', 401),
  })

  assert.equal(result.ok, false)
  assert.match(result.reason, /HTTP 401/)
  assert.match(result.reason, /token_expired/)
  assert.equal(result.reason.includes('someone@example.com'), false)
})
