import { calculateSessionCost } from './cost.mjs'

export const inject = ['sessions', 'webServer']

export const ROUTE_PATH = '/api/session-cost'

export function readSessionCost(sessions, args) {
  const sessionId = args?.sessionId
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { ok: false, reason: 'invalid-session' }
  }

  const session = sessions.get(sessionId)
  if (session === undefined || session === null) {
    return { ok: false, reason: 'session-not-found' }
  }

  return {
    ok: true,
    sessionId,
    ...calculateSessionCost(session.snapshotEvents())
  }
}

export function apply(ctx) {
  const cache = new WeakMap()

  const load = sessionId => {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      return { ok: false, reason: 'invalid-session' }
    }

    const session = ctx.sessions.get(sessionId)
    if (session === undefined || session === null) {
      return { ok: false, reason: 'session-not-found' }
    }

    const seq = session.seq
    const cached = cache.get(session)
    if (cached !== undefined && cached.seq === seq) return cached.value

    const value = {
      ok: true,
      sessionId,
      asOfSeq: seq,
      ...calculateSessionCost(session.snapshotEvents())
    }
    cache.set(session, { seq, value })
    return value
  }

  const route = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: (req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const value = load(url.searchParams.get('sessionId'))
      res.writeHead(200, {
        'content-type': 'application/json',
        'cache-control': 'no-store'
      })
      res.end(JSON.stringify(value))
    }
  })

  ctx.effect(() => route, `dsh-session-cost: ${ROUTE_PATH}`)
}
