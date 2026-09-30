# AGENTS.md

## 范围

本文件适用于 `packages/codex-usage`。根目录 `AGENTS.md` 的全局规则同时生效。

插件只读 DSH 中现有 Codex 凭据，查询额度并在 Web composer 下方显示结果；它不负责 OAuth，也不刷新凭据。

## DSH 依赖面

### Client module

- Web client 注入 `@deepseek-ai/dsh-client-ui-conversation`。

### Host Services / APIs

- `webServer.register(...)`
- `ctx.effect(...)`
- 按请求惰性解析 `ctx.get('credentials')`
- 用 `ctx.get('credentials', false)` 区分“已挂载但未 active”和“未挂载”
- `credentials.readRecord('llm-pi-ai/openai-codex')`

`ctx.get` 的 strict/active 语义是重要行为契约：不得因为升级把 Credentials 在 `apply()` 中读取一次并永久缓存。

### Credential record contract

当前只读取 grant record 中允许使用的字段：

- `record.kind === 'grant'`
- `record.payload.access`
- `record.payload.accountId`
- `record.payload.expires`

不读取或刷新 refresh token。DSH Credentials record schema、active 生命周期或 Codex credential key 变化时必须重新审计。

### Web Slot contract

客户端依赖：

- Client services：`slots`、`timer`
- Slot：`conversation.composer.dock`
- 注册 ID：`codex-usage`
- order：`20`

内置 stats 当前占 `order: 0`，`session-cost` 占 `order: 10`；兼容升级不得无理由改变这组相对顺序。

## 行为与安全契约

- access token 只能进入发往 Codex 上游的请求头，不能进入日志、错误、HTTP 响应、前端或本插件持久化。
- wham/usage 原始响应不能离开 Host；只能返回经过投影的额度标量。
- 所有上游错误文本离开 Host 前必须经过脱敏。
- 插件绝不调用 `credentials.modifyRecord()`，也不自行刷新 OAuth。
- Credentials 暂未 active 时必须能够在后续请求自行恢复，不能把失败永久缓存。
- Client 维持 5 分钟轮询、连续 3 次失败后暂停并等待手动重试的现有行为。

## DSH 升级重点

上游出现以下变化时优先检查本插件：

- Cordis `ctx.get` strict/active 语义；
- Credentials service、record schema 或 Codex credential storage；
- Web Server route 生命周期；
- Client ModuleLoader、`slots`、`timer`；
- `conversation.composer.dock` Slot；
- Plugin Manager 加载/卸载/HMR 生命周期。
