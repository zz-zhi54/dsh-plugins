import * as McpClient from '@deepseek-ai/dsh-mcp-client'

import {readProjectMcpEntries, resolveProjectMcpEntry} from './config.mjs'

export const name = 'project-mcp'

/**
 * 在一个 Agent 的 Scope 中启动单个 MCP。
 *
 * 每个配置项独立完成转换、官方 schema 校验和 Cordis plugin 挂载；任意
 * 配置或启动错误都直接抛出，终止当前 Agent 的启动，不在这里吞掉异常。
 */
function startServer(agent, projectCwd, rawEntry, index) {
    let config = resolveProjectMcpEntry(rawEntry, projectCwd, index)
    config = McpClient.Config({
        ...config,
        // 项目 MCP 初次连接失败时让官方 MCP Client 直接拒绝 Fiber，错误
        // 保持原始传播路径，不由本插件改写、降级或转换成 warning。
        failOnStartupError: true
    })

    // 关键隔离点：必须从 agent.ctx，而不是全局 ctx 挂载 MCP。这样官方
    // MCP Client 注册的工具会进入当前 Agent 的 Scope，并随 Agent 一起销毁。
    agent.ctx.plugin(McpClient, config)
}

/**
 * 根据 Agent 所属 Session 装载整个项目的 MCP 列表。
 *
 * 项目身份只取自 agent.session.header.cwd。该值由 DSH Session/Workspace
 * 生命周期维护，因此不会被启动 dsh web 的全局 cwd 污染。配置在 Agent 创建
 * 时读取一次；本插件第一版不监听文件变化，也不复用其他 Agent 的连接。
 */
function mountProjectServers(agent) {
    const projectCwd = agent.session.header.cwd
    if (typeof projectCwd !== 'string' || projectCwd.length === 0) return

    const entries = readProjectMcpEntries(projectCwd)
    entries.forEach((entry, index) => startServer(agent, projectCwd, entry, index))
}

export function apply(ctx) {
    // agent/created 发生时，Agent 已经拥有自己的 agent.ctx 和 Session。通过
    // 该事件为每个 Agent 单独挂载 MCP，既能保留全局 MCP，又不会把项目 MCP
    // 注册到 Host 全局 Scope；Agent 销毁时 Cordis 会自动清理这些子插件。
    ctx.on('agent/created', ({agent}) => mountProjectServers(agent))
}
