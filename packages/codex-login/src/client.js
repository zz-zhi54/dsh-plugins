// Browser bundle for the dsh-codex-login-plugin client half.
//
// The web module graph serves plugin `./client` exports verbatim inside a
// concatenated classic script and requires the factory-form CJS shape the
// shipped packages build (`window.__ModuleLoader__.load({ id, factory })`).
// A raw ESM source here would be a SyntaxError for the WHOLE application
// combo, so this file is the bundle; keep it in sync with the logic it
// carries. The only baseline request is `react`, answered by the static
// platform module table — no `dsh.client.external` entries are needed.
window.__ModuleLoader__.load({
  id: 'dsh-codex-login-plugin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    const React = require('react')

    const startPath = '/api/codex-login/start'
    const pollPath = '/api/codex-login/poll'
    const answerPath = '/api/codex-login/answer'
    const cancelPath = '/api/codex-login/cancel'

    async function jsonRequest(path, init) {
      const response = await fetch(path, init)
      const value = await response.json()
      if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : `Codex login request failed (${response.status})`)
      return value
    }

    function Card({ timer }) {
      const [open, setOpen] = React.useState(false)
      const [attemptId, setAttemptId] = React.useState(null)
      const [state, setState] = React.useState({ status: 'idle', notices: [] })
      const [draft, setDraft] = React.useState('')
      const [error, setError] = React.useState('')

      React.useEffect(() => {
        if (!open || attemptId === null) return undefined
        let live = true
        const poll = async () => {
          try {
            const next = await jsonRequest(`${pollPath}?attemptId=${encodeURIComponent(attemptId)}`)
            if (live) {
              setState(next)
              if (typeof next.error === 'string') setError(next.error)
            }
          } catch (reason) {
            if (live) setError(reason instanceof Error ? reason.message : String(reason))
          }
        }
        void poll()
        const dispose = timer.interval(() => { void poll() }, 500)
        return () => { live = false; dispose() }
      }, [open, attemptId, timer])

      const close = async () => {
        if (attemptId !== null && state.status === 'running') {
          try {
            await jsonRequest(`${cancelPath}?attemptId=${encodeURIComponent(attemptId)}`)
          } catch {}
        }
        setOpen(false)
        setAttemptId(null)
        setState({ status: 'idle', notices: [] })
        setDraft('')
      }

      const start = async () => {
        setError('')
        setState({ status: 'running', notices: [] })
        setOpen(true)
        try {
          const result = await jsonRequest(startPath)
          setAttemptId(result.attemptId)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
          setState({ status: 'failed', notices: [] })
        }
      }

      const prompt = state.prompt
      const submit = async () => {
        if (attemptId === null || prompt === undefined || draft.length === 0) return
        try {
          await jsonRequest(answerPath, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ attemptId, promptId: prompt.promptId, value: draft }),
          })
          setDraft('')
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }

      const notices = state.notices.map((notice, index) => React.createElement('div', {
        key: `${String(index)}-${notice.message}`,
      },
      React.createElement('p', null, notice.message),
      notice.url === undefined ? null : React.createElement('p', null,
        React.createElement('a', { href: notice.url, target: '_blank', rel: 'noreferrer' }, notice.url)),
      notice.code === undefined ? null : React.createElement('pre', null, notice.code)))

      const promptNode = prompt === undefined ? null : React.createElement('div', null,
        React.createElement('p', null, prompt.message),
        prompt.kind === 'select'
          ? React.createElement('select', {
              value: draft,
              onChange: event => setDraft(event.target.value),
            },
            React.createElement('option', { value: '' }, 'Select…'),
            ...(prompt.options ?? []).map(option => React.createElement('option', {
              key: option.id,
              value: option.id,
            }, option.label)))
          : React.createElement('input', {
              type: prompt.kind === 'secret' ? 'password' : 'text',
              value: draft,
              placeholder: prompt.placeholder,
              onChange: event => setDraft(event.target.value),
              onKeyDown: event => { if (event.key === 'Enter') void submit() },
            }),
        React.createElement('button', {
          type: 'button',
          disabled: draft.length === 0,
          onClick: () => { void submit() },
        }, 'Continue'))

      const dialog = !open ? null : React.createElement('div', {
        style: {
          position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
          background: 'rgba(0,0,0,.35)', pointerEvents: 'auto',
        },
      }, React.createElement('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': 'ChatGPT login',
        style: {
          width: 'min(520px, 100%)', maxHeight: '90vh', overflow: 'auto',
          padding: 18, borderRadius: 16, background: 'var(--dsw-alias-fill-white)',
        },
      },
      React.createElement('h3', null, 'Sign in with ChatGPT'),
      React.createElement('p', null,
        state.status === 'running' ? 'Waiting for authorization…'
          : state.status === 'authorized' ? 'Authorized.'
            : state.status === 'cancelled' ? 'Cancelled.'
              : state.status === 'failed' ? 'Authorization failed.' : ''),
      ...notices,
      promptNode,
      error === '' ? null : React.createElement('p', { role: 'alert' }, error),
      React.createElement('button', { type: 'button', onClick: () => { void close() } }, 'Close')))

      return React.createElement('div', {
        style: {
          marginTop: 12, padding: 14, border: '1px solid var(--dsw-alias-border-l4)',
          borderRadius: 14, color: 'var(--dsw-alias-label-primary)',
        },
      },
      React.createElement('p', null, 'ChatGPT / Codex'),
      React.createElement('p', null, 'Use ChatGPT OAuth to sign in for Codex.'),
      React.createElement('button', {
        type: 'button',
        disabled: state.status === 'running',
        onClick: () => { void start() },
      }, state.status === 'authorized' ? 'Connected' : 'Sign in with ChatGPT'),
      dialog)
    }

    const inject = ['slots', 'timer']

    function apply(ctx) {
      const slots = ctx.slots
      const timer = ctx.timer
      slots.inject('settings.models.footer', () => slots.register({
        name: 'settings.models.footer',
        id: 'dsh-codex-login',
        order: -10,
      }, () => React.createElement(Card, { timer })))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
