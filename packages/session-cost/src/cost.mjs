import { calculateCost } from '@earendil-works/pi-ai'
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all'

const TOKEN_FIELDS = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens']

function tokenCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function normalizeUsage(usage) {
  if (usage === null || typeof usage !== 'object') return null

  const inputTokens = tokenCount(usage.inputTokens)
  const outputTokens = tokenCount(usage.outputTokens)
  if (inputTokens === null || outputTokens === null) return null

  const cacheReadTokens = tokenCount(usage.cacheReadTokens) ?? 0
  const cacheWriteTokens = tokenCount(usage.cacheWriteTokens) ?? 0
  const suppliedTotal = tokenCount(usage.totalTokens)
  const totalTokens = suppliedTotal ?? inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens
  }
}

function routeFromSource(source) {
  if (source === null || typeof source !== 'object' || source.kind !== 'model') return null
  const provider = typeof source.provider === 'string' && source.provider.length > 0 ? source.provider : null
  const model = typeof source.model === 'string' && source.model.length > 0 ? source.model : null
  if (provider === null || model === null) return null
  return { provider, model }
}

function routeFromHeader(header) {
  const config = header?.config
  if (config === null || typeof config !== 'object') return null
  const provider = typeof config.provider === 'string' && config.provider.length > 0 ? config.provider : null
  const model = typeof config.model === 'string' && config.model.length > 0 ? config.model : null
  if (provider === null || model === null) return null
  return { provider, model }
}

function routeKey(route) {
  return route === null ? 'unknown/unknown' : `${route.provider}/${route.model}`
}

function emptyTokens() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    totalTokens: 0
  }
}

function emptyGroup(route) {
  return {
    provider: route?.provider ?? null,
    model: route?.model ?? null,
    key: routeKey(route),
    requests: 0,
    tokens: emptyTokens(),
    usages: []
  }
}

function addTokens(target, usage) {
  for (const field of TOKEN_FIELDS) target[field] += usage[field]
  target.totalTokens += usage.totalTokens
}

function modelCost(resolveModel, route, usage) {
  if (route === null) return null

  let model
  try {
    model = resolveModel(route.provider, route.model)
  } catch {
    return null
  }
  if (model === undefined || model === null) return null

  try {
    const pricedUsage = {
      input: usage.inputTokens,
      output: usage.outputTokens,
      cacheRead: usage.cacheReadTokens,
      cacheWrite: usage.cacheWriteTokens,
      totalTokens: usage.totalTokens,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0
      }
    }
    const cost = calculateCost(model, pricedUsage)
    return Number.isFinite(cost?.total) && cost.total >= 0 ? cost.total : null
  } catch {
    return null
  }
}

function usageFromAttempt(stream) {
  if (!Array.isArray(stream)) return null
  let latest
  for (const record of stream) {
    const chunk = record?.chunk
    if (chunk?.type === 'usage') latest = chunk.usage
  }
  return normalizeUsage(latest)
}

function appendRequest(state, route, usage) {
  const key = routeKey(route)
  const current = state.groups[key] ?? emptyGroup(route)
  const tokens = { ...current.tokens }
  addTokens(tokens, usage)
  const group = {
    ...current,
    requests: current.requests + 1,
    tokens,
    usages: [...current.usages, usage]
  }
  return {
    ...state,
    groups: { ...state.groups, [key]: group }
  }
}

/** Create the plain-JSON state used by the session-cost host projection. */
export function createCostState() {
  return {
    currentRoute: null,
    groups: {}
  }
}

/** Fold one durable Session event without reading the Session log. */
export function applyCostEvent(state, event) {
  const type = event?.type
  const data = event?.data

  if (type === 'request/header') {
    return { ...state, currentRoute: routeFromHeader(data?.header) }
  }

  if (type === 'assistant/message') {
    const usage = normalizeUsage(data?.usage)
    return usage === null ? state : appendRequest(state, routeFromSource(data?.message?.source), usage)
  }

  if (type === 'assistant/attempt') {
    const usage = usageFromAttempt(data?.stream)
    return usage === null ? state : appendRequest(state, state.currentRoute, usage)
  }

  return state
}

function groupPricing(group, resolveModel) {
  const route = group.provider === null || group.model === null
    ? null
    : { provider: group.provider, model: group.model }
  let cost = 0
  let pricedRequests = 0
  let unknownRequests = 0

  for (const usage of group.usages) {
    const requestCost = modelCost(resolveModel, route, usage)
    if (requestCost === null) {
      unknownRequests += 1
    } else {
      pricedRequests += 1
      cost += requestCost
    }
  }

  const pricing = unknownRequests === 0 ? 'known' : pricedRequests > 0 ? 'partial' : 'unknown'
  return {
    cost: pricing === 'unknown' ? null : cost,
    pricing
  }
}

/** Project a previously folded state into the existing HTTP response shape. */
export function calculateSessionCostFromState(state, options = {}) {
  const resolveModel = options.resolveModel ?? getBuiltinModel
  const groups = Object.values(state?.groups ?? {}).map(group => {
    const priced = groupPricing(group, resolveModel)
    return {
      provider: group.provider,
      model: group.model,
      key: group.key,
      requests: group.requests,
      tokens: group.tokens,
      cost: priced.cost,
      pricing: priced.pricing
    }
  }).sort((a, b) => {
    const costA = a.cost ?? -1
    const costB = b.cost ?? -1
    return costB - costA || b.tokens.totalTokens - a.tokens.totalTokens || a.key.localeCompare(b.key)
  })

  const pricing = groups.length === 0
    ? 'empty'
    : groups.every(group => group.pricing === 'known')
      ? 'known'
      : groups.some(group => group.pricing !== 'unknown')
        ? 'partial'
        : 'unknown'

  return {
    currency: 'USD',
    requests: groups.reduce((sum, group) => sum + group.requests, 0),
    tokens: groups.reduce((total, group) => {
      addTokens(total, group.tokens)
      return total
    }, emptyTokens()),
    cost: pricing === 'unknown' ? null : groups.reduce((sum, group) => sum + (group.cost ?? 0), 0),
    pricing,
    groups
  }
}

export function calculateSessionCost(events, options = {}) {
  let state = createCostState()
  for (const event of Array.isArray(events) ? events : []) state = applyCostEvent(state, event)
  return calculateSessionCostFromState(state, options)
}
