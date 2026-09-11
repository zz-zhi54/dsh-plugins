import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

const PROFILE = 'web'
const PACKAGE_NAME = 'dsh-plugin-manager'
const RPC_CHANNEL = '/dsh-plugin-manager'
const MAX_OUTPUT_BYTES = 256 * 1024
const GRACE_MS = 5000

type InstalledPackage = {
  version?: unknown
  dsh?: {
    bundle?: {
      patch?: unknown
    }
  }
}

type Manifest = {
  dependencies?: Record<string, unknown>
}

type Plugin = {
  name: string
  version: string | null
  source: string | null
  spec: string | null
  specRedacted: boolean
  status: 'installed' | 'unavailable'
  self: boolean
}

type ParsedRequest = {
  operation: 'add' | 'remove'
  value: string
}

type CodedError = Error & { code: string }

type RpcFailure = {
  ok: false
  error: {
    code: string
    message: string
    details: Record<string, never>
  }
}

type CollectedText = {
  text?: string
  lossy?: boolean
}

type CollectedOutput = {
  stdout?: { readFrom(offset: number): CollectedText | undefined }
  stderr?: { readFrom(offset: number): CollectedText | undefined }
}

type ProcessResult = {
  exitCode: number | null
  signal: string | null
}

type ProcessHandle = {
  done: Promise<ProcessResult>
  collected?: CollectedOutput
}

type Subprocess = {
  resolveExecutable(command: string, env: Record<string, string>, signal?: AbortSignal): Promise<string>
  spawn(options: {
    argv: string[]
    cwd: string
    env: Record<string, string>
    graceMs: number
    signal?: AbortSignal
    stdio: {
      stdin: 'ignore'
      stdout: { maxBytes: number }
      stderr: { maxBytes: number }
    }
  }): ProcessHandle
}

type Connection = {
  rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown, signal?: AbortSignal) => unknown,
    ): () => Promise<unknown>
  }
}

type WebContext = {
  connection: Connection
  effect(factory: () => () => Promise<void>, label?: string): unknown
}

type HostContext = {
  subprocess: Subprocess
  inject(names: string[], callback: (ctx: WebContext) => unknown): unknown
}

export const inject = ['connection', 'subprocess'] as const

/**
 * 清理所有会经 Connection RPC 进入浏览器的文本。
 *
 * 这里同时处理三类来源：manifest 里的 plugin spec、CLI 的 stdout/stderr，
 * 以及异常消息。它们都可能包含 Git URL userinfo、Bearer token、凭据字段或
 * 账号身份字段；页面只需要排障信息，不需要这些敏感值。
 */
export function redact(value: unknown): string {
  return String(value)
    .replace(/([a-z][a-z\d+.-]*:\/\/)[^/@\s]+@/gi, '$1<redacted>@')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted>')
    .replace(/"(access_token|refresh_token|access|refresh|email|user_id|userId|account_id|accountId|chatgpt_user_id|chatgpt_account_id)"\s*:\s*(?:"[^"]*"|[^,}\s]+)/gi, '"$1":"<redacted>"')
    .replace(/(^|[?&\s])(access_token|refresh_token|access|refresh|email|user_id|userId|account_id|accountId|chatgpt_user_id|chatgpt_account_id)=([^&#\s]+)/gi, '$1$2=<redacted>')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<redacted-email>')
}

const failure = (code: string, message: string): RpcFailure => ({
  ok: false,
  error: { code, message, details: {} },
})
const errorMessage = (error: unknown): string => redact(error instanceof Error ? error.message : String(error))
const codedError = (code: string, message: string): CodedError => Object.assign(new Error(message), { code })

/**
 * 校验并归一化浏览器请求，避免后续 CLI 代码重复判断 add/remove 的字段名。
 * 返回值只保留 CLI 真正需要的 operation/value，并去掉首尾空白。
 */
export function parseRequest(input: unknown): ParsedRequest {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw codedError('bad-request', 'request must be an object')
  }

  const request = input as Record<string, unknown>
  const operation = request.operation === 'add'
    ? 'add'
    : request.operation === 'remove'
      ? 'remove'
      : null
  if (operation === null) throw codedError('bad-request', 'operation must be add or remove')
  const field = operation === 'add' ? 'spec' : 'name'

  const value = request[field]
  if (typeof value !== 'string' || value.trim() === '') {
    throw codedError('bad-request', `${field} must be a non-empty string`)
  }
  return { operation, value: value.trim() }
}

/**
 * 从固定 profile 的 dependencies 投影可管理插件。
 *
 * package.json 里还会有普通依赖，所以只有已安装包带有 DSH bundle patch 时才纳入；
 * 找不到对应 package.json 的条目仍保留为 unavailable，便于页面发现安装不完整。
 * 对外只返回页面需要的标量，不把安装包的完整 package.json 传出 Host。
 */
export function listPlugins(
  manifest: Manifest | null | undefined,
  readInstalled: (name: string) => InstalledPackage | undefined,
): Plugin[] {
  const dependencies = manifest?.dependencies
  if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)) return []

  return Object.entries(dependencies)
    .map(([name, rawSpec]) => {
      const installed = readInstalled(name)
      if (installed !== undefined && installed.dsh?.bundle?.patch === undefined) return null

      const spec = typeof rawSpec === 'string' ? redact(rawSpec) : null
      const hash = spec?.indexOf('#') ?? -1
      return {
        name,
        version: typeof installed?.version === 'string' ? installed.version : null,
        source: spec === null ? null : hash < 0 ? spec : spec.slice(0, hash),
        spec,
        specRedacted: typeof rawSpec === 'string' && spec !== rawSpec,
        status: installed === undefined ? 'unavailable' : 'installed',
        self: name === PACKAGE_NAME,
      }
    })
    .filter((plugin): plugin is Plugin => plugin !== null)
}

/**
 * 读取唯一允许管理的 web profile，并把依赖清单转换成前端模型。
 * 单个安装包读取失败只影响该插件的状态；profile manifest 本身读取失败则交给
 * state RPC 的错误边界处理，因为此时无法判断页面展示的列表是否可靠。
 */
export function readPluginState(): { profile: string; plugins: Plugin[] } {
  const profileDir = join(resolveDshHome(), 'profiles', PROFILE)
  const manifest = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8')) as Manifest
  return {
    profile: PROFILE,
    plugins: listPlugins(manifest, name => {
      try {
        return JSON.parse(readFileSync(join(profileDir, 'node_modules', name, 'package.json'), 'utf8')) as InstalledPackage
      } catch {
        return undefined
      }
    }),
  }
}

/**
 * 执行一次 DSH CLI 操作。
 *
 * executable 由 subprocess capability 解析，用户输入始终作为独立 argv 项传递，
 * 因而不会经过 shell。子进程完成 promise 的拒绝也被归一化为操作结果，只有
 * 启动阶段（例如找不到 executable 或 spawn 失败）才继续抛给 RPC 边界处理。
 */
async function run(ctx: HostContext, request: ParsedRequest, signal?: AbortSignal) {
  const home = resolveDshHome()
  const executable = await ctx.subprocess.resolveExecutable('dsh', { DSH_HOME: home }, signal)
  const handle = ctx.subprocess.spawn({
    argv: [executable, 'plugin', '--profile', PROFILE, request.operation, request.value],
    cwd: process.cwd(),
    env: { DSH_HOME: home },
    graceMs: GRACE_MS,
    signal,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: MAX_OUTPUT_BYTES },
      stderr: { maxBytes: MAX_OUTPUT_BYTES },
    },
  })

  const settled = await handle.done.then(
    result => ({ ok: true as const, result }),
    error => ({ ok: false as const, error }),
  )
  const stdout = handle.collected?.stdout?.readFrom(0)
  const stderr = handle.collected?.stderr?.readFrom(0)
  const stdoutText = redact(stdout?.text ?? '')
  const stderrText = redact(stderr?.text ?? '')
  const output = {
    stdout: stdoutText,
    stderr: stderrText,
    output: [stdoutText, stderrText && `[stderr]\n${stderrText}`].filter(Boolean).join('\n'),
    truncated: Boolean(stdout?.lossy || stderr?.lossy),
  }

  if (!settled.ok) {
    return {
      ...output,
      exitCode: null,
      signal: null,
      ok: false as const,
      error: errorMessage(settled.error),
    }
  }

  const result = settled.result
  if (result.exitCode !== 0 || result.signal !== null) {
    return {
      ...output,
      exitCode: result.exitCode,
      signal: result.signal,
      ok: false as const,
      error: `dsh exited with code ${result.exitCode}`,
    }
  }
  return {
    ...output,
    exitCode: result.exitCode,
    signal: result.signal,
    ok: true as const,
  }
}

/**
 * 把 Host 内部异常转换为稳定的 RPC 响应。
 * 这是唯一的通用异常边界：校验错误可以携带自己的 code，未分类异常则使用
 * 当前 endpoint 的 fallbackCode，避免每个分支都重复 try/catch 和错误格式化。
 */
async function protect<T>(fallbackCode: string, action: () => T | Promise<T>): Promise<T | RpcFailure> {
  try {
    return await action()
  } catch (error) {
    return failure((error as Partial<CodedError>)?.code ?? fallbackCode, errorMessage(error))
  }
}

/**
 * 注册插件管理器的两个 RPC endpoint，并限制同一时间只有一个 CLI 操作。
 * running 只保护当前 Host 进程内的并发；finally 保证失败、取消或异常启动后仍可重试。
 */
export function apply(ctx: HostContext): void {
  let running = false
  const handle = (endpoint: string, payload: unknown, signal?: AbortSignal) => {
    if (endpoint === 'state') {
      return protect('state-read-failed', () => ({ ok: true, value: readPluginState() }))
    }
    if (endpoint !== 'operate') return failure('unknown-endpoint', `unknown endpoint ${String(endpoint)}`)
    if (running) return failure('operation-in-progress', 'another plugin operation is already running')

    running = true
    return protect('operation-failed', async () => {
      const request = parseRequest(payload)
      if (request.operation === 'remove' && request.value === PACKAGE_NAME) {
        throw codedError('self-remove-denied', `${PACKAGE_NAME} cannot be removed from its own settings page`)
      }

      const result = await run(ctx, request, signal)
      if (!result.ok) {
        return { ok: true, value: { ok: false, error: result.error ?? `dsh exited with code ${result.exitCode}`, result } }
      }
      return { ok: true, value: { ok: true, result } }
    }).finally(() => {
      running = false
    })
  }

  ctx.inject(['webServer'], webCtx => {
    const dispose = webCtx.connection.rpc.handle(RPC_CHANNEL, handle)
    webCtx.effect(() => async () => { await dispose() }, 'dsh-plugin-manager: RPC')
  })
}
