const CODEX_KEY = 'llm-pi-ai/openai-codex'

/**
 * Install the standalone Codex OAuth bridge into a normal Host composition.
 * This module intentionally uses the real authorization Service; unlike the
 * temporary dynamic sandbox, a normal Host has Node's AbortController.
 */
export const inject = ['authorization', 'webServer']

export function apply(ctx) {
  const authorization = ctx.authorization

  const attempts = new Map()
  let sequence = 0

  const projectNotice = notice => ({
    message: String(notice.message),
    ...(notice.url === undefined ? {} : { url: String(notice.url) }),
    ...(notice.code === undefined ? {} : { code: String(notice.code) }),
  })

  const projectPrompt = (prompt, promptId) => ({
    promptId,
    kind: prompt.kind,
    message: String(prompt.message),
    ...(prompt.placeholder === undefined ? {} : { placeholder: String(prompt.placeholder) }),
    ...(prompt.kind === 'select'
      ? { options: prompt.options.map(option => ({
          id: String(option.id),
          label: String(option.label),
          ...(option.description === undefined ? {} : { description: String(option.description) }),
        })) }
      : {}),
  })

  const snapshot = attempt => ({
    status: attempt.status,
    notices: attempt.notices,
    ...(attempt.prompt === undefined ? {} : { prompt: attempt.prompt.view }),
    ...(attempt.error === undefined ? {} : { error: attempt.error }),
  })

  const start = () => {
    for (const attempt of attempts.values()) {
      if (attempt.status === 'running') return { attemptId: attempt.id }
    }

    const flow = authorization.describe(CODEX_KEY)
    if (flow === undefined) throw new Error('Codex OAuth flow is not registered')
    if (!flow.methods.some(method => method.id === 'oauth')) {
      throw new Error('Codex authorization does not offer OAuth')
    }

    const attempt = {
      id: `codex-${String(++sequence)}`,
      status: 'running',
      notices: [],
      prompt: undefined,
      promptSequence: 0,
      error: undefined,
    }
    attempts.set(attempt.id, attempt)

    void authorization.begin({
      key: CODEX_KEY,
      method: 'oauth',
      interaction: {
        notify(notice) {
          attempt.notices = [...attempt.notices, projectNotice(notice)].slice(-20)
        },
        prompt(prompt) {
          const promptId = `${attempt.id}-prompt-${String(++attempt.promptSequence)}`
          let resolveAnswer
          let rejectAnswer
          let settled = false
          const answer = new Promise((resolve, reject) => {
            resolveAnswer = resolve
            rejectAnswer = reject
          })
          const pending = {
            id: promptId,
            view: projectPrompt(prompt, promptId),
            resolve(value) {
              if (settled) return
              settled = true
              resolveAnswer(value)
            },
            reject(reason) {
              if (settled) return
              settled = true
              rejectAnswer(reason)
            },
          }
          attempt.prompt = pending
          return answer
        },
      },
    }).then(outcome => {
      attempt.prompt?.reject(new Error('authorization attempt settled'))
      attempt.prompt = undefined
      attempt.status = outcome.status
    }).catch(error => {
      attempt.prompt?.reject(error)
      attempt.prompt = undefined
      attempt.status = 'failed'
      attempt.error = error instanceof Error ? error.message : String(error)
    })

    return { attemptId: attempt.id }
  }

  const poll = args => {
    const attempt = attempts.get(String(args?.attemptId ?? ''))
    if (attempt === undefined) throw new Error('Unknown Codex authorization attempt')
    return snapshot(attempt)
  }

  const answer = args => {
    const attempt = attempts.get(String(args?.attemptId ?? ''))
    if (attempt === undefined || attempt.prompt === undefined
      || attempt.prompt.id !== String(args?.promptId ?? '')) {
      throw new Error('Codex authorization is not waiting for this prompt')
    }
    const pending = attempt.prompt
    attempt.prompt = undefined
    pending.resolve(String(args?.value ?? ''))
    return { ok: true }
  }

  const cancel = args => {
    const attempt = attempts.get(String(args?.attemptId ?? ''))
    if (attempt !== undefined && attempt.status === 'running') {
      attempt.prompt?.reject(new Error('authorization cancelled'))
      attempt.prompt = undefined
      authorization.cancel(CODEX_KEY)
    }
    return { ok: true }
  }

  const readJson = req => new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', chunk => {
      body += chunk
      if (body.length > 64 * 1024) reject(new Error('request body too large'))
    })
    req.on('end', () => {
      try { resolve(body === '' ? {} : JSON.parse(body)) } catch (error) { reject(error) }
    })
    req.on('error', reject)
  })

  const routes = [
    ctx.webServer.register({
      kind: 'exact',
      path: '/api/codex-login/start',
      handler: async (_req, res) => {
        try {
          const value = start()
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(value))
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/api/codex-login/poll',
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        try {
          const value = poll({ attemptId: url.searchParams.get('attemptId') })
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(value))
        } catch (error) {
          res.writeHead(404, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/api/codex-login/answer',
      handler: async (req, res) => {
        try {
          const value = await readJson(req)
          const result = answer(value)
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify(result))
        } catch (error) {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
        }
      },
    }),
    ctx.webServer.register({
      kind: 'exact',
      path: '/api/codex-login/cancel',
      handler: async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        cancel({ attemptId: url.searchParams.get('attemptId') })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      },
    }),
  ]

  ctx.effect(() => () => {
    for (const route of routes) route()
    for (const attempt of attempts.values()) {
      if (attempt.status === 'running') authorization.cancel(CODEX_KEY)
    }
    attempts.clear()
  }, 'dsh-codex-login: routes and attempts')
}
