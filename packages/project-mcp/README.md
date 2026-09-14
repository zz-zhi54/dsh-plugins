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

支持 `stdio` 和 `streamable-http`。stdio MCP 未指定 `cwd` 时使用项目目录；相对 `cwd` 相对项目目录解析。`serverName` 使用 DSH MCP Client 的命名规则。

项目配置和 MCP schema 错误会同步抛出；MCP 初次连接错误会拒绝对应的 Cordis Fiber。错误不在本插件层捕获、降级或转换成 warning，项目 MCP 始终强制使用 `failOnStartupError: true`。由于 `agent/created` 是发布后的同步事件，异步 MCP 启动不会回滚已经发布的 Agent；插件会保存每个 Agent 的加载 Promise，并在 `agent/pre-step` 中等待它完成后再继续后续处理。

## 隔离与全局 MCP

项目 MCP 通过 DSH 的 `agent.ctx` 注册，因此工具注册和连接生命周期都属于单个 Agent：

- Agent A 只看到全局工具和 A 项目工具；
- Agent B 只看到全局工具和 B 项目工具；
- 不同项目可以使用相同的 `serverName`，各自连接和工具互不共享；
- 全局 MCP 不变，仍按原来的 Profile 配置加载。

项目配置在 Agent 创建时读取一次。插件只监听 `agent/created`，不会在加载或 Profile/HMR 重载时扫描并补挂载已经存在的 Agent；修改配置后，新建或重新创建 Agent 即可生效。第一版不提供热更新或跨 Agent 连接复用。

## 安装

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/project-mcp'
```
