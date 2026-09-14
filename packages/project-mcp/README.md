# dsh-project-mcp-plugin

为 DSH Web 增加项目级 MCP。插件安装后，每个 Agent 创建时都会根据该 Agent Session 的实际 `cwd` 读取一次项目配置：

```text
<session.cwd>/.dsh/mcp.yml
```

不会使用启动 `dsh web` 的进程工作目录，也不监听配置文件变化。

## 配置

文件内容使用现有 `@deepseek-ai/dsh-mcp-client` 的配置字段，放在顶层 `servers` 数组中：

```yaml
servers:
  - serverName: idea
    transport: stdio
    command: npx
    args: ['-y', 'idea-mcp']

  - serverName: mysql
    transport: stdio
    command: npx
    args: ['-y', 'mysql-mcp']
    env:
      DATABASE_URL: mysql://127.0.0.1/app

  - serverName: github
    transport: streamable-http
    url: http://127.0.0.1:3000/mcp
```

支持 `stdio` 和 `streamable-http`。stdio MCP 未指定 `cwd` 时使用项目目录；相对 `cwd` 相对项目目录解析。配置中的 `serverName` 使用 DSH MCP Client 的命名规则；插件会在运行时为每个 Agent 添加短后缀，避免同一项目多个 Agent 的 MCP 实例冲突，模型看到的工具名也会包含该后缀。

项目配置、MCP schema 和连接错误都只通过 `console.error` 记录，不会阻断 Agent 的创建、首步或后续正常流程。每个项目 MCP 在 Agent 创建后启动，并由 `agent/pre-step` 等待挂载完成，确保首步能看到已经连接的工具；失败时会记录错误并继续流程，单个配置项失败不会影响同一项目的其他 MCP。项目 MCP 使用 `failOnStartupError: true`，已经建立连接后的断线仍由官方客户端按其重连策略处理。

## 隔离与全局 MCP

项目 MCP 通过 DSH 的 `agent.ctx` 注册，因此工具注册和连接生命周期都属于单个 Agent。插件会防止同一 Agent 被重复通知时重复挂载；同一项目配置中的重复 `serverName` 也会跳过并记录到 `console.error`：

- Agent A 只看到全局工具和 A 项目工具；
- Agent B 只看到全局工具和 B 项目工具；
- 不同项目可以使用相同的 `serverName`，各自连接和工具互不共享；
- 全局 MCP 不变，仍按原来的 Profile 配置加载。

项目配置在 Agent 创建时读取一次。插件只监听 `agent/created`，不会在加载或 Profile/HMR 重载时扫描并补挂载已经存在的 Agent；修改配置后，新建或重新创建 Agent 即可生效。第一版不提供热更新或跨 Agent 连接复用。

## 安装

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/project-mcp'
```
