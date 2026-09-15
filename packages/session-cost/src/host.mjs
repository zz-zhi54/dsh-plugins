import { calculateSessionCostFromState } from './cost.mjs'
import { sessionCostProjectionDefinition } from './projection.mjs'

export const inject = ['sessions', 'sessionProjections', 'webServer']

export const ROUTE_PATH = '/api/session-cost'

export function readSessionCost(sessions, args, sessionProjections) {
  const sessionId = args?.sessionId
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { ok: false, reason: 'invalid-session' }
  }

  const session = sessions.get(sessionId)
  if (session === undefined || session === null) {
    return { ok: false, reason: 'session-not-found' }
  }

  const state = sessionProjections?.stateOf(session, 'sessionCost')
  if (state === undefined) {
    return { ok: false, reason: 'projection-unavailable' }
  }

  return {
    ok: true,
    sessionId,
    ...calculateSessionCostFromState(state)
  }
}

export function apply(ctx) {
  ctx.sessionProjections.register(sessionCostProjectionDefinition)

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

    const state = ctx.sessionProjections.stateOf(session, 'sessionCost')
    if (state === undefined) {
      return { ok: false, reason: 'projection-unavailable' }
    }

    const value = {
      ok: true,
      sessionId,
      asOfSeq: seq,
      ...calculateSessionCostFromState(state)
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
