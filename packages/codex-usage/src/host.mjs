// Codex 用量 Host 半：把一次额度查询暴露成 Web 路由，供底栏 pill 读取。
//
// 安全：本模块对外只输出 `{ ok, usage }` / `{ ok: false, reason }`。
// usage 是 projectUsagePayload() 投影后的标量，reason 已经脱敏；
// access token 与 wham/usage 原始响应都不会经过这条路由。

import { queryCodexUsage } from './codex-usage.mjs'

/** Web 客户端读取额度的路由。 */
const ROUTE_PATH = '/api/codex-usage'

/** 结果缓存时长：额度只在真正使用 Codex 时变化，60s 足够新，也能挡住连点。 */
const CACHE_MS = 60000

export const inject = ['webServer']

/**
 * 每次查询时重新解析 credentials，绝不在 apply() 时解析一次并缓存。
 *
 * 踩过的坑：Cordis 的 `ctx.get(name)` 默认 strict —— 只有提供该服务的 fiber 处于
 * active 状态才返回，否则是 undefined。`dsh-credentials-local` 的 `[Service.init]()`
 * 要先读 `.credentials.yaml` 并启动文件监视，而插件树是并发激活的，所以本插件的
 * apply() 很可能早于它就绪。在 apply() 里取一次并缓存，就会永久拿到 undefined
 * （症状：路由永远回 "宿主没有挂载 credentials 服务"）。
 *
 * 按次解析既躲开这个竞态，也保留可诊断的失败原因：strict=false 会忽略 active
 * 检查，能取到就说明服务已挂载、只是还没就绪。
 *
 * @param ctx - Cordis 上下文。
 * @returns 就绪时为 `{ credentials }`，否则为带原因的 `{ reason }`。
 */
export function resolveCredentials(ctx) {
  const active = ctx.get('credentials')
  if (active !== undefined && active !== null) return { credentials: active }
  const provided = ctx.get('credentials', false)
  if (provided !== undefined && provided !== null) {
    return { reason: 'credentials 服务尚未就绪，请稍后刷新' }
  }
  return { reason: '宿主没有挂载 credentials 服务，无法读取 Codex 凭据' }
}

export function apply(ctx) {
  let cache = null
  let inflight = null

  /**
   * 取一次额度结果。
   * @param force - true 时绕过缓存（界面上的点击刷新）。
   */
  const load = async force => {
    if (force !== true && cache !== null && Date.now() - cache.at < CACHE_MS) return cache.value
    // 单飞：并发请求共用同一次上游查询，避免连点打出一串请求。
    if (inflight !== null) return inflight

    const resolved = resolveCredentials(ctx)
    // 失败结果不进缓存，下一次轮询会重新解析 —— 这是"服务稍后就绪"能自愈的前提。
    const pending = resolved.credentials === undefined
      ? Promise.resolve({ ok: false, reason: resolved.reason })
      : queryCodexUsage({ credentials: resolved.credentials })

    inflight = pending
      .then(value => {
        if (value.ok) cache = { at: Date.now(), value }
        return value
      })
      .catch(() => ({ ok: false, reason: '查询 Codex 额度失败' }))
      .then(value => {
        inflight = null
        return value
      })
    return inflight
  }

  const route = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const value = await load(url.searchParams.get('force') === '1')
      // 无论成功失败都回 200：失败语义由响应体的 ok 字段表达，客户端只有一条解析路径。
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
      res.end(JSON.stringify(value))
    },
  })

  ctx.effect(() => route, 'dsh-codex-usage: route')
}
