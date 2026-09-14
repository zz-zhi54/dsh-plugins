import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { parse } from 'yaml'

/**
 * 项目级 MCP 配置文件的相对路径。
 *
 * 这里故意只相对 Agent Session 的 cwd 拼接，绝不读取启动 dsh web 时的
 * process.cwd()。这样同一个 Web 实例中的不同项目可以分别命中自己的配置。
 */
export const PROJECT_MCP_FILE = join('.dsh', 'mcp.yml')

/** 判断 YAML 节点是否为可展开的普通对象。 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 根据 Session cwd 计算项目 MCP 配置的绝对路径。
 *
 * Session cwd 由 DSH Agent/Session 机制提供，是项目归属的唯一输入；不在
 * 这里做目录向上搜索，避免把嵌套目录错误归属到另一个项目。
 */
function filePathFor(projectCwd) {
  if (typeof projectCwd !== 'string' || projectCwd.length === 0) {
    throw new TypeError('project cwd must be a non-empty string')
  }
  return join(projectCwd, PROJECT_MCP_FILE)
}

/**
 * 读取一个项目的 MCP 声明。
 *
 * 返回值是未经单项校验的服务器数组，单项校验留给调用方执行，以便错误
 * 能够指出具体的 `servers[index]`。文件不存在是正常情况，表示该项目没有
 * 项目级 MCP；其他文件系统错误和 YAML 错误由调用方统一记录，不会阻断
 * Agent 的正常流程。
 */
export function readProjectMcpEntries(projectCwd, options = {}) {
  const filePath = filePathFor(projectCwd)
  const read = options.readFile ?? readFileSync
  const parseYaml = options.parseYaml ?? parse
  // 项目没有配置文件是正常情况；文件存在但读取或解析失败时直接抛出，
  // 由 Host 插件边界记录错误并继续 Agent 的正常流程。
  if (!existsSync(filePath)) return []
  const source = read(filePath, 'utf8')
  // 只解析 YAML 数据，不执行 YAML 中的 JavaScript 标签或表达式。
  const document = parseYaml(String(source))

  if (document === null || document === undefined) return []
  if (Array.isArray(document)) return document
  if (!isRecord(document) || !Object.hasOwn(document, 'servers')) {
    throw new Error(`${filePath} must contain a top-level "servers" array`)
  }
  if (!Array.isArray(document.servers)) {
    throw new Error(`${filePath}.servers must be an array`)
  }
  return document.servers
}

/**
 * 将一个原始项目配置项转换成官方 dsh-mcp-client 接受的配置形状。
 *
 * 配置字段尽量原样传给官方 MCP Client，避免插件复制一套 MCP 配置能力；
 * 本函数只负责项目级约束、基本错误定位，以及 stdio cwd 的项目目录解析。
 * 未指定 cwd 时强制使用所属项目目录，而不是 dsh web 的启动目录。
 */
export function resolveProjectMcpEntry(rawEntry, projectCwd, index = 0) {
  if (!isRecord(rawEntry)) {
    throw new Error(`servers[${index}] must be an object`)
  }

  const serverName = rawEntry.serverName ?? rawEntry.name
  if (typeof serverName !== 'string' || serverName.length === 0) {
    throw new Error(`servers[${index}].serverName is required`)
  }

  const transport = rawEntry.transport
  if (transport !== 'stdio' && transport !== 'streamable-http') {
    throw new Error(`servers[${index}].transport must be "stdio" or "streamable-http"`)
  }

  const config = { ...rawEntry, serverName, transport }
  delete config.name

  if (transport === 'stdio') {
    if (typeof config.command !== 'string' || config.command.length === 0) {
      throw new Error(`servers[${index}].command is required for stdio MCP servers`)
    }
    // MCP Client 会把 cwd 直接交给子进程传输层，因此这里必须在启动前
    // 完成解析；否则相对路径会意外相对到 Host 的启动目录。
    if (config.cwd === undefined || config.cwd === '') config.cwd = projectCwd
    else if (typeof config.cwd !== 'string') throw new Error(`servers[${index}].cwd must be a string`)
    else if (!isAbsolute(config.cwd)) config.cwd = resolve(projectCwd, config.cwd)
  }

  return config
}

/** 暴露配置路径计算，供测试和文档示例复用同一条路径规则。 */
export function projectMcpFile(projectCwd) {
  return filePathFor(projectCwd)
}
