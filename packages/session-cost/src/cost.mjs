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
    cost: 0,
    pricedRequests: 0,
    unknownRequests: 0
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

function appendRequest(groups, totals, route, usage, resolveModel) {
  const key = routeKey(route)
  let group = groups.get(key)
  if (group === undefined) {
    group = emptyGroup(route)
    groups.set(key, group)
  }

  group.requests += 1
  addTokens(group.tokens, usage)
  addTokens(totals.tokens, usage)

  const cost = modelCost(resolveModel, route, usage)
  if (cost === null) {
    group.unknownRequests += 1
    return
  }

  group.pricedRequests += 1
  group.cost += cost
  totals.cost += cost
}

function groupPricing(group) {
  if (group.unknownRequests === 0) return 'known'
  if (group.pricedRequests > 0) return 'partial'
  return 'unknown'
}

export function calculateSessionCost(events, options = {}) {
  const resolveModel = options.resolveModel ?? getBuiltinModel
  const groups = new Map()
  const totals = { tokens: emptyTokens(), cost: 0 }
  let currentRoute = null

  for (const event of Array.isArray(events) ? events : []) {
    const type = event?.type
    const data = event?.data

    if (type === 'request/header') {
      currentRoute = routeFromHeader(data?.header)
      continue
    }

    if (type === 'assistant/message') {
      const usage = normalizeUsage(data?.usage)
      if (usage !== null) appendRequest(groups, totals, routeFromSource(data?.message?.source), usage, resolveModel)
      continue
    }

    if (type === 'assistant/attempt') {
      const usage = usageFromAttempt(data?.stream)
      if (usage !== null) appendRequest(groups, totals, currentRoute, usage, resolveModel)
    }
  }

  const entries = [...groups.values()]
    .map((group) => ({
      provider: group.provider,
      model: group.model,
      key: group.key,
      requests: group.requests,
      tokens: group.tokens,
      cost: groupPricing(group) === 'unknown' ? null : group.cost,
      pricing: groupPricing(group)
    }))
    .sort((a, b) => {
      const costA = a.cost ?? -1
      const costB = b.cost ?? -1
      return costB - costA || b.tokens.totalTokens - a.tokens.totalTokens || a.key.localeCompare(b.key)
    })

  const pricing = entries.length === 0
    ? 'empty'
    : entries.every((entry) => entry.pricing === 'known')
      ? 'known'
      : entries.some((entry) => entry.pricing !== 'unknown')
        ? 'partial'
        : 'unknown'

  return {
    currency: 'USD',
    requests: entries.reduce((sum, entry) => sum + entry.requests, 0),
    tokens: totals.tokens,
    cost: pricing === 'unknown' ? null : totals.cost,
    pricing,
    groups: entries
  }
}
