// Codex 额度查询：凭据读取、请求构造、响应投影。
//
// ============================ 安全边界（改动前必读） ============================
// 1. access token 只允许出现在本模块构造的 HTTP 请求头里。除此之外一律禁止：
//    不写日志、不进错误信息、不进 HTTP 响应、不落盘、不进前端。
// 2. 所有对外抛出的错误文本必须先经 redact() 处理。上游响应可能回显凭据，
//    未脱敏的原文不得离开本模块。
// 3. wham/usage 的原始响应包含 email / user_id / account_id 等身份信息，
//    绝不允许整体转发给前端；只允许经 projectUsagePayload() 投影出的标量离开。
// 4. 本插件绝不刷新凭据。refresh token 连读都不读：dsh-llm-pi-ai 的
//    credentialStoreFrom() 注释明确警告，两个进程并发轮换同一个 refresh token
//    会丢掉先写入的那一份。过期就让 codex 侧或用户去刷新。
// 5. 请求头对象只允许直接交给 fetch，不得序列化、复制到返回值或记录。
// ==============================================================================
//
// ============================ 上游同步规则 ============================
// 本模块不维护一份独立、写死的 Codex 私有协议。
//
// 1. HTTP 请求头：跟随当前 DSH 的 Codex provider 实现。
//    每次 DSH 升级时检查当前版本的 buildBaseCodexHeaders() 或等价实现，
//    保持本插件与 DSH 实际 Codex 请求的认证、account-id、originator、UA 等特征一致。
//    不要把某个历史版本、文件路径、行号或字段列表当成永久契约。
//
// 2. 额度查询请求：跟随当前 pi 生态中实际查询 Codex 用量的插件实现。
//    核对 endpoint、HTTP method、响应字段、额度窗口归一化和错误处理；不要自行发明协议。
//
// 3. 不机械复制模型流式请求专用头。
//    GET 用量查询只带当前上游实际需要的头；SSE / Responses 专用头只有在额度查询
//    上游也明确要求时才同步。
//
// 4. DSH 或 pi 上游发生变化时，以“读取当前实现并最小同步”为准。
//    本文件记录的是同步关系，不是需要人工长期维护的历史快照。
// ===================================================================

import { arch, platform, release } from 'node:os'

/** 额度查询端点。对齐 @narumitw/pi-codex-usage src/query.ts:55。 */
export const USAGE_ENDPOINT = 'https://chatgpt.com/backend-api/wham/usage'

/** DSH 凭据记录键：由 dsh-llm-pi-ai 的 openai-codex 路由写入，codex-login 完成登录。 */
export const CREDENTIAL_KEY = 'llm-pi-ai/openai-codex'

/** 请求超时。对齐 pi 插件的 AbortController 超时语义。 */
export const DEFAULT_TIMEOUT_MS = 20000

/** 进入错误文本的上游响应片段上限。 */
const MAX_BODY_CHARS = 600

/** 单个错误原因的长度上限：错误原因会显示在界面上，保持短。 */
const MAX_REASON_CHARS = 200

const numberOrNull = value => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/**
 * 与当前 DSH Codex provider 使用的 User-Agent 保持一致。
 *
 * DSH 升级时读取当前实现并同步；不要依赖历史 pi-ai 版本号、文件路径或行号。
 */
export function codexUserAgent() {
  return `pi (${platform()} ${release()}; ${arch()})`
}

/**
 * 构造 Codex 额度请求头。
 *
 * 字段应跟随当前 DSH Codex provider 的 buildBaseCodexHeaders() 或等价实现；
 * 额度 endpoint / method / 响应契约则跟随当前 pi 用量插件实现。
 * 这里只复制 GET 用量查询实际需要的头，不机械照搬模型 SSE / Responses 专用头。
 *
 * @param access - Codex OAuth access token；秘密，只允许交给 fetch。
 * @param accountId - 可选账号 id；缺失时不发送 chatgpt-account-id。
 * @param userAgent - 便于测试注入；默认与 pi-ai 一致。
 * @returns 请求头对象；调用方不得序列化或记录它。
 */
export function buildCodexUsageHeaders(access, accountId, userAgent = codexUserAgent()) {
  const headers = {
    authorization: `Bearer ${access}`,
    originator: 'pi',
    'user-agent': userAgent,
    accept: 'application/json',
  }
  if (typeof accountId === 'string' && accountId.length > 0) headers['chatgpt-account-id'] = accountId
  return headers
}

/**
 * 上游响应或异常文本进入错误信息前的脱敏。
 *
 * 对齐 @narumitw/pi-codex-usage src/query.ts:162 的 redactErrorBody()，并额外覆盖
 * **身份字段**：wham/usage 的响应含 email / user_id / account_id，只掩 token 不够，
 * 这些同样不允许离开 Host（见文件头安全边界第 3 条）。
 *
 * @param text - 任意待脱敏文本。
 * @param limit - 截断长度。
 * @returns 可安全展示的文本。
 */
export function redact(text, limit = MAX_BODY_CHARS) {
  return String(text)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/"(access_token|refresh_token|access|refresh)"\s*:\s*"[^"]+"/gi, '"$1":"<redacted>"')
    // 身份字段：键名同时兼容 snake_case 与 camelCase
    .replace(
      /"(email|user_id|userId|account_id|accountId|chatgpt_user_id|chatgpt_account_id)"\s*:\s*"[^"]*"/gi,
      '"$1":"<redacted>"',
    )
    // 兜底：键名不认识时，裸奔的邮箱形态也一并抹掉
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<redacted-email>')
    .trim()
    .slice(0, limit)
}

/**
 * 从 DSH credentials store 读取 Codex OAuth 凭据。
 *
 * 返回的 access 是秘密，只允许交给 buildCodexUsageHeaders()。这里刻意不返回
 * refresh token —— 见文件头安全边界第 4 条。
 *
 * @param credentials - `ctx.credentials`；缺席时抛错。
 * @param key - 凭据记录键。
 * @returns `{ access, accountId, expiresAt }`，后两项可能为 undefined。
 */
export async function readCodexCredential(credentials, key = CREDENTIAL_KEY) {
  if (credentials === undefined || credentials === null) {
    throw new Error('宿主没有挂载 credentials 服务，无法读取 Codex 凭据')
  }

  const record = await credentials.readRecord(key)
  if (record === undefined || record === null) throw new Error(`DSH 里没有 Codex 登录凭据（${key}）`)
  if (record.kind !== 'grant') throw new Error('Codex 凭据记录类型不是 grant')

  const payload = record.payload
  if (payload === null || typeof payload !== 'object') throw new Error('Codex 凭据记录内容为空')

  const access = typeof payload.access === 'string' && payload.access.length > 0 ? payload.access : undefined
  if (access === undefined) throw new Error('Codex 凭据里没有 access token')

  return {
    access,
    accountId: typeof payload.accountId === 'string' && payload.accountId.length > 0 ? payload.accountId : undefined,
    expiresAt: numberOrNull(payload.expires) ?? undefined,
  }
}

/**
 * 归一化一个额度窗口。字段名对齐 pi 插件的 normalizeBackendWindow()。
 *
 * `reset_at` 保持「秒」：codex app-server 的 resetsAt 同样是秒，前端按秒处理。
 *
 * @param raw - wham/usage 的 primary_window 或 secondary_window。
 * @returns `{ usedPercent, windowMinutes, resetsAt }`，无法识别时返回 null。
 */
export function normalizeWindow(raw) {
  if (raw === null || typeof raw !== 'object') return null
  const usedPercent = numberOrNull(raw.used_percent)
  if (usedPercent === null) return null
  const seconds = numberOrNull(raw.limit_window_seconds)
  return {
    usedPercent: Math.min(100, Math.max(0, usedPercent)),
    windowMinutes: seconds === null ? null : Math.round(seconds / 60),
    resetsAt: numberOrNull(raw.reset_at),
  }
}

/**
 * 把 wham/usage 响应投影成本插件对外的唯一数据形状。
 *
 * 安全边界第 3 条：这里返回的字段就是允许离开 Host 的全部内容。
 * 不要为了省事改成返回整个 payload —— 原始响应含 email 与 user_id。
 *
 * @param payload - JSON.parse 后的 wham/usage 响应。
 * @param fetchedAt - 取得该响应的时间戳（毫秒）。
 * @returns 投影结果，两个窗口都不可用时返回 null。
 */
export function projectUsagePayload(payload, fetchedAt) {
  if (payload === null || typeof payload !== 'object') return null

  const rateLimit = payload.rate_limit
  const group = rateLimit !== null && typeof rateLimit === 'object' ? rateLimit : null
  const primary = normalizeWindow(group === null ? null : group.primary_window)
  const secondary = normalizeWindow(group === null ? null : group.secondary_window)
  if (primary === null && secondary === null) return null

  return {
    primary,
    secondary,
    planType: typeof payload.plan_type === 'string' ? payload.plan_type : null,
    fetchedAt,
  }
}

/**
 * 查询一次 Codex 额度。
 *
 * 返回值只含投影后的标量；access token 与原始响应都不离开本函数。
 * 本函数不抛异常：失败一律返回 `{ ok: false, reason }`，reason 已脱敏。
 *
 * @param options.credentials - `ctx.credentials`。
 * @param options.fetchImpl - 便于测试注入；默认全局 fetch。
 * @param options.now - 便于测试注入的时间函数。
 * @param options.timeoutMs - 请求超时。
 * @param options.key - 凭据记录键。
 * @returns `{ ok: true, usage }` 或 `{ ok: false, reason }`。
 */
export async function queryCodexUsage(options) {
  const {
    credentials,
    fetchImpl = globalThis.fetch,
    now = Date.now,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    key = CREDENTIAL_KEY,
  } = options

  try {
    const credential = await readCodexCredential(credentials, key)
    if (credential.expiresAt !== undefined && credential.expiresAt <= now()) {
      return { ok: false, reason: 'DSH 的 Codex 凭据已过期；在 DSH 里用一次 Codex 或重新登录后即可恢复' }
    }

    const response = await fetchImpl(USAGE_ENDPOINT, {
      method: 'GET',
      headers: buildCodexUsageHeaders(credential.access, credential.accountId),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await response.text()

    if (!response.ok) {
      const detail = redact(body, MAX_REASON_CHARS)
      return { ok: false, reason: `Codex 用量端点返回 HTTP ${response.status}${detail.length > 0 ? `：${detail}` : ''}` }
    }

    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      return { ok: false, reason: `Codex 用量端点响应不是 JSON：${redact(body, MAX_REASON_CHARS)}` }
    }

    const usage = projectUsagePayload(payload, now())
    if (usage === null) {
      return { ok: false, reason: `Codex 用量响应里没有额度窗口：${redact(body, MAX_REASON_CHARS)}` }
    }
    return { ok: true, usage }
  } catch (error) {
    // 异常文本可能来自上游，一律脱敏后再对外。
    return { ok: false, reason: redact(error instanceof Error ? error.message : String(error), MAX_REASON_CHARS) }
  }
}
