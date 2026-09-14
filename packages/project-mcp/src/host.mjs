import * as McpClient from '@deepseek-ai/dsh-mcp-client'

import {readProjectMcpEntries, resolveProjectMcpEntry} from './config.mjs'

export const name = 'project-mcp'

// 防止同一 Agent 被重复通知时重复挂载同一个项目 MCP。
const projectMcpLoads = new WeakMap()
const agentNamespaces = new WeakMap()
let nextAgentNamespace = 0

function reportError(message, error) {
  console.error(`[project-mcp] ${message}`, error)
}

function namespaceFor(agent) {
  let namespace = agentNamespaces.get(agent)
  if (namespace === undefined) {
    namespace = (++nextAgentNamespace).toString(36)
    agentNamespaces.set(agent, namespace)
  }
  return namespace
}

/** 为每个 Agent 生成唯一且不超过 MCP 限制的运行时 serverName。 */
function runtimeServerName(agent, configuredName, index) {
  const suffix = `-${namespaceFor(agent)}-${index.toString(36)}`
  const prefixLength = Math.max(1, 32 - suffix.length)
  return `${configuredName.slice(0, prefixLength)}${suffix}`
}

/** 将一个项目配置项转换成官方 MCP Client 配置。 */
function resolveServerConfig(agent, projectCwd, rawEntry, index) {
  const config = resolveProjectMcpEntry(rawEntry, projectCwd, index)
  // 先用用户配置的名字走一次官方 schema 校验，再替换成 Agent 唯一名字。
  const validated = McpClient.Config({
    ...config,
    failOnStartupError: true,
  })
  return {
    configuredServerName: validated.serverName,
    config: {
      ...validated,
      serverName: runtimeServerName(agent, validated.serverName, index),
    },
  }
}

/** 在 Agent 自己的 Scope 中启动单个 MCP，并返回可等待的加载结果。 */
function startServer(agent, resolved) {
  try {
    const load = agent.ctx.plugin(McpClient, resolved.config)
    // Fiber.await() 会重新抛出启动错误（普通 thenable 不会），在这里处理后
    // 既能记录错误，也能让 agent/pre-step 在失败时继续执行。
    if (typeof load?.await === 'function') {
      return load.await().catch((error) => {
        reportError(`failed to start server "${resolved.configuredServerName}"`, error)
      })
    }
    return Promise.resolve(load).catch((error) => {
      reportError(`failed to start server "${resolved.configuredServerName}"`, error)
    })
  } catch (error) {
    reportError(`failed to start server "${resolved.configuredServerName}"`, error)
    return Promise.resolve()
  }
}

/**
 * 加载项目的全部 MCP，并返回等待所有挂载完成的 Promise。
 * 每项相互隔离，单个配置或服务不可用时，仍然继续启动其他项目 MCP。
 */
function mountProjectServers(agent) {
  const projectCwd = agent.session.header.cwd
  if (typeof projectCwd !== 'string' || projectCwd.length === 0) return

  let entries
  try {
    entries = readProjectMcpEntries(projectCwd)
  } catch (error) {
    reportError(`failed to read MCP configuration for "${projectCwd}"`, error)
    return
  }

  const loads = []
  const serverNames = new Set()
  for (const [index, entry] of entries.entries()) {
    let resolved
    try {
      resolved = resolveServerConfig(agent, projectCwd, entry, index)
    } catch (error) {
      reportError(`failed to load servers[${index}]`, error)
      continue
    }
    if (serverNames.has(resolved.configuredServerName)) {
      console.error(`[project-mcp] skipped duplicate serverName "${resolved.configuredServerName}" in project configuration`)
      continue
    }
    serverNames.add(resolved.configuredServerName)
    loads.push(startServer(agent, resolved))
  }
  return Promise.all(loads)
}

export function apply(ctx) {
  const mountAgent = (agent) => {
    // agent/created is expected once, but this also protects against duplicate
    // listeners or a repeated notification during profile/plugin reload.
    if (projectMcpLoads.has(agent)) return
    try {
      const load = mountProjectServers(agent) ?? Promise.resolve()
      projectMcpLoads.set(agent, load.catch((error) => {
        reportError('failed to mount project MCP servers', error)
      }))
    } catch (error) {
      reportError('failed to mount project MCP servers', error)
      projectMcpLoads.set(agent, Promise.resolve())
    }
  }

  // agent/pre-step 必须等待 MCP 挂载完成，否则首步收集工具时可能看不到
  // 项目 MCP；失败时 Promise 已被捕获，流程仍会继续。
  ctx.on('agent/created', ({agent}) => mountAgent(agent))
  ctx.on('agent/pre-step', async ({agent}, next) => {
    await projectMcpLoads.get(agent)
    return next()
  })
}
