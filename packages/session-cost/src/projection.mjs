import { z } from 'zod'

import { applyCostEvent, createCostState } from './cost.mjs'

const routeSchema = z.object({
  provider: z.string(),
  model: z.string()
}).strict()

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative()
}).strict()

const groupSchema = z.object({
  provider: z.string().nullable(),
  model: z.string().nullable(),
  key: z.string(),
  requests: z.number().int().nonnegative(),
  tokens: usageSchema,
  usages: z.array(usageSchema)
}).strict()

const stateSchema = z.object({
  currentRoute: routeSchema.nullable(),
  groups: z.record(z.string(), groupSchema)
}).strict()

/** Host-only projection for incremental, repricable session-cost accounting. */
export const sessionCostProjectionDefinition = {
  key: 'sessionCost',
  stateVersion: 1,
  stateSchema,
  init: createCostState,
  apply: applyCostEvent
}
