import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode } from 'react'

type ClientPluginContext = ClientContext & { connection: ConnectionHandle }

declare const require: (id: string) => unknown

const React = require('react') as typeof import('react')

const CHANNEL = '/dsh-plugin-manager'

const panel: CSSProperties = {
  maxWidth: 760,
  padding: '4px 0 24px',
  color: 'var(--dsw-alias-label-primary)',
}
const muted: CSSProperties = { color: 'var(--dsw-alias-label-secondary)', lineHeight: 1.5 }
const section: CSSProperties = {
  marginTop: 16,
  padding: 14,
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 10,
}
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 }
const input: CSSProperties = {
  boxSizing: 'border-box',
  minWidth: 0,
  flex: 1,
  padding: '8px 10px',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  color: 'inherit',
  background: 'var(--dsw-alias-bg-layer-1)',
  font: 'inherit',
}
const output: CSSProperties = {
  margin: '8px 0 0',
  padding: 10,
  maxHeight: 260,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-2, rgb(127 127 127 / 8%))',
  fontSize: 12,
}
const errorBox: CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 8,
  color: 'var(--dsw-alias-state-error-primary, #b42318)',
  background: 'var(--dsw-alias-state-error-bg, rgb(180 35 24 / 8%))',
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

type PluginState = {
  profile: string
  plugins: Plugin[]
}

type OperationPayload = {
  operation: 'add' | 'remove'
  spec?: string
  name?: string
}

type CommandOutput = {
  stdout?: string
  stderr?: string
  output?: string
}

type OperationResult = {
  ok: boolean
  error?: string
  result?: CommandOutput
}

type RpcCall = (endpoint: string, payload?: Record<string, unknown>) => Promise<unknown>

type Feedback = {
  running?: boolean
  ok?: boolean
  label: string
  error?: string
  value?: OperationResult
}

type SlotProps = {
  call: RpcCall
}

interface OperationError extends Error {
  payload?: OperationResult
}

function Manager({ call }: SlotProps): ReactNode {
  const [plugins, setPlugins] = React.useState<Plugin[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [spec, setSpec] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)
  const [confirm, setConfirm] = React.useState<string | null>(null)

  const load = React.useCallback(async (showLoading = true, resetDrafts = false) => {
    if (showLoading) setLoading(true)
    try {
      const state = await call('state') as PluginState
      const next = Array.isArray(state?.plugins) ? state.plugins : []
      setPlugins(next)
      setDrafts(previous => Object.fromEntries(next.map(plugin => {
        const current = plugin.specRedacted === true ? '' : plugin.spec ?? ''
        return [plugin.name, resetDrafts ? current : previous[plugin.name] ?? current]
      })))
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [call])

  React.useEffect(() => { void load() }, [load])

  const run = async (body: OperationPayload, label: string) => {
    if (busy) return
    setBusy(true)
    setFeedback({ running: true, label })
    try {
      const value = await call('operate', body) as OperationResult
      if (!value.ok) {
        const reason: OperationError = Object.assign(
          new Error(value.error || 'DSH plugin operation failed'),
          { payload: value },
        )
        throw reason
      }
      setFeedback({ ok: true, label, value })
      await load(false, true)
    } catch (reason) {
      const errorReason = reason as OperationError
      setFeedback({
        ok: false,
        label,
        error: reason instanceof Error ? reason.message : String(reason),
        value: errorReason.payload,
      })
    } finally {
      setBusy(false)
    }
  }

  const install = () => {
    const value = spec.trim()
    if (value !== '') void run({ operation: 'add', spec: value }, value)
  }
  const feedbackResult = (feedback?.value?.result ?? feedback?.value) as CommandOutput | undefined
  const feedbackOutput = typeof feedbackResult?.output === 'string' && feedbackResult.output !== ''
    ? feedbackResult.output
    : [feedbackResult?.stdout, feedbackResult?.stderr && `[stderr]\n${feedbackResult.stderr}`]
      .filter(Boolean)
      .join('\n')

  return React.createElement('div', { style: panel },
    React.createElement('p', { style: muted }, '只管理 Web Profile，实际操作继续使用 DSH Plugin CLI。'),
    React.createElement('section', { style: section },
      React.createElement('h3', { style: { margin: '0 0 10px' } }, '安装插件'),
      React.createElement('div', { style: row },
        React.createElement('input', {
          type: 'text',
          value: spec,
          disabled: busy,
          placeholder: '输入完整 plugin spec',
          onChange: (event: ChangeEvent<HTMLInputElement>) => setSpec(event.target.value),
          onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') install() },
          style: input,
        }),
        React.createElement('button', {
          type: 'button',
          disabled: busy || spec.trim() === '',
          onClick: install,
        }, busy ? '执行中…' : '安装'))),
    feedback === null ? null : React.createElement('div', {
      role: feedback.ok === false ? 'alert' : 'status',
      style: feedback.ok === false ? errorBox : Object.assign({}, muted, { marginTop: 12 }),
    },
    React.createElement('strong', null, `${feedback.running ? '执行中' : feedback.ok ? '成功' : '失败'}：${feedback.label}`),
    feedback.error ? React.createElement('div', { style: { marginTop: 5 } }, feedback.error) : null,
    feedback.running ? null : React.createElement('pre', { style: output }, feedbackOutput || 'DSH CLI 没有输出。')),
    confirm === null ? null : React.createElement('div', { style: errorBox },
      React.createElement('strong', null, `确认删除插件 ${confirm}？`),
      React.createElement('div', Object.assign({}, row, { marginTop: 10 }),
        React.createElement('button', { type: 'button', onClick: () => setConfirm(null) }, '取消'),
        React.createElement('button', {
          type: 'button',
          onClick: () => {
            const name = confirm
            setConfirm(null)
            void run({ operation: 'remove', name }, name)
          },
        }, '删除'))),
    React.createElement('section', { style: section },
      React.createElement('h3', { style: { margin: '0 0 10px' } }, '已安装插件'),
      loading ? React.createElement('p', { style: muted }, '正在读取插件…') : null,
      error ? React.createElement('div', { style: errorBox },
        React.createElement('div', null, `读取失败：${error}`),
        React.createElement('button', {
          type: 'button',
          onClick: () => { void load() },
          style: { marginTop: 8 },
        }, '重试')) : null,
      !loading && !error && plugins.length === 0 ? React.createElement('p', { style: muted }, '暂无可管理的插件。') : null,
      !error ? plugins.map(plugin => {
        const draft = drafts[plugin.name] ?? ''
        const self = plugin.self === true
        return React.createElement('article', {
          key: plugin.name,
          style: Object.assign({}, section, { marginTop: 10 }),
        },
        React.createElement('div', Object.assign({}, row, { justifyContent: 'space-between' }),
          React.createElement('strong', { style: { overflowWrap: 'anywhere' } }, plugin.name),
          self ? React.createElement('span', { style: muted }, '当前正在使用') : null),
        React.createElement('p', { style: muted }, `版本：${plugin.version ?? '—'}　状态：${plugin.status === 'installed' ? '已安装' : '安装信息不可用'}`),
        React.createElement('p', {
          style: Object.assign({}, muted, { overflowWrap: 'anywhere' }),
        }, `来源：${plugin.source ?? '—'}`),
        plugin.specRedacted === true ? React.createElement('p', { style: muted }, '当前 spec 包含敏感信息，已隐藏；更新时请重新输入完整值。') : null,
        React.createElement('input', {
          type: 'text',
          value: draft,
          disabled: busy,
          'aria-label': `${plugin.name} spec`,
          onChange: (event: ChangeEvent<HTMLInputElement>) => setDrafts(previous => Object.assign({}, previous, { [plugin.name]: event.target.value })),
          style: input,
        }),
        React.createElement('div', Object.assign({}, row, { marginTop: 10 }),
          React.createElement('button', {
            type: 'button',
            disabled: busy || draft.trim() === '',
            onClick: () => {
              const value = draft.trim()
              if (value !== '') void run({ operation: 'add', spec: value }, plugin.name)
            },
          }, busy ? '更新中…' : '更新'),
          React.createElement('button', {
            type: 'button',
            disabled: busy || self,
            onClick: () => setConfirm(plugin.name),
          }, busy ? '删除中…' : '删除')))
      }) : null),
  )
}

export const inject = ['slots', 'connection'] as const

export function apply(ctx: ClientPluginContext): void {
  const call: RpcCall = async (endpoint, payload = {}) => {
    const result = await ctx.connection.rpc.call(CHANNEL, endpoint, payload)
    if (!result?.ok) throw new Error(result?.error?.message ?? 'RPC request failed')
    return result.value
  }

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'manager',
    order: 20,
    label: '插件管理',
    inject: () => ({ call }),
  }, (props: SlotProps) => React.createElement(Manager, props)))
}
