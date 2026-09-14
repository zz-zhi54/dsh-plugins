import * as McpClient from '@deepseek-ai/dsh-mcp-client'

import {readProjectMcpEntries, resolveProjectMcpEntry} from './config.mjs'

export const name = 'project-mcp'

/**
 * 在一个 Agent 的 Scope 中启动单个 MCP。
 *
 * 每个配置项独立完成转换、官方 schema 校验和 Cordis plugin 挂载；配置错误
 * 同步抛出，MCP 初次连接错误通过加载 Promise 传播，不在这里吞掉或改写异常。
 */
function resolveServerConfig(projectCwd, rawEntry, index) {
    const config = resolveProjectMcpEntry(rawEntry, projectCwd, index)
    return McpClient.Config({
        ...config,
        // 项目 MCP 初次连接失败时让官方 MCP Client 直接拒绝 Fiber，错误
        // 保持原始传播路径，不由本插件改写、降级或转换成 warning。
        failOnStartupError: true
    })
}

function startServer(agent, config) {
    // 关键隔离点：必须从 agent.ctx，而不是全局 ctx 挂载 MCP。这样官方
    // MCP Client 注册的工具会进入当前 Agent 的 Scope，并随 Agent 一起销毁。
    return agent.ctx.plugin(McpClient, config)
}

/**
 * 根据 Agent 所属 Session 装载整个项目的 MCP 列表。
 *
 * 项目身份只取自 agent.session.header.cwd。该值由 DSH Session/Workspace
 * 生命周期维护，因此不会被启动 dsh web 的全局 cwd 污染。配置在 Agent 创建
 * 时读取一次；本插件第一版不监听文件变化，也不复用其他 Agent 的连接。
 */
async function loadServers(agent, configs) {
    for (const config of configs) {
        // Cordis plugin Fiber 是 thenable；等待每个 MCP 的初始连接和工具发现
        // 完成后再启动下一个项目 MCP。
        await startServer(agent, config)
    }
}

function mountProjectServers(agent) {
    const projectCwd = agent.session.header.cwd
    if (typeof projectCwd !== 'string' || projectCwd.length === 0) return

    const entries = readProjectMcpEntries(projectCwd)
    // 先解析全部配置，再创建子 Fiber，保证配置和 schema 错误在
    // agent/created listener 中同步抛出；MCP 连接错误通过加载 Promise 传播。
    const configs = entries.map((entry, index) => resolveServerConfig(projectCwd, entry, index))
    return loadServers(agent, configs)
}

export function apply(ctx) {
    const projectMcpLoads = new WeakMap()

    // 只处理插件加载后新创建的 Agent；不扫描已有 Agent，避免 Profile/HMR
    // 重载时一次性启动所有项目 MCP，或重复挂载已有 Agent 的 MCP。
    const mountAgent = (agent) => {
        const load = mountProjectServers(agent)
        projectMcpLoads.set(agent, load)
        return load
    }

    // agent/created 发生时，Agent 已经拥有自己的 agent.ctx 和 Session。通过
    // 该事件为每个 Agent 单独挂载 MCP，既能保留全局 MCP，又不会把项目 MCP
    // 注册到 Host 全局 Scope；Agent 销毁时 Cordis 会自动清理这些子插件。
    // agent/created 只负责启动并保存加载 Promise；在 agent/pre-step 处等待
    // 完成后再交给后续 listener，避免 Agent 首步看到不完整的工具集。
    ctx.on('agent/created', ({agent}) => mountAgent(agent))
    ctx.on('agent/pre-step', async ({agent}, next) => {
        await projectMcpLoads.get(agent)
        return next()
    })
}
