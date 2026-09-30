# AGENTS.md

## 范围

本文件适用于 `packages/codex-login`。根目录 `AGENTS.md` 的全局规则同时生效。

该插件只负责把 DSH 已注册的 ChatGPT / Codex OAuth 流程临时暴露到 Web 设置页；登录完成后的凭据持久化仍由 DSH 自己负责。

## DSH 依赖面

### Package / Client module

- `@deepseek-ai/dsh-authorization`
- Web client 注入：
  - `@deepseek-ai/dsh-client-ui-renderer`
  - `@deepseek-ai/dsh-client-ui-settings-models`

### Host Services / APIs

- `authorization.describe(key)`
- `authorization.begin({ key, method, interaction })`
- `authorization.cancel(key)`
- `webServer.register(...)`
- `ctx.effect(...)`

### Authorization interaction contract

`authorization.begin()` 的 `interaction` 依赖：

- `notify(notice)`
- `prompt(prompt) -> Promise<answer>`
- prompt 的 `kind`、`message`、`placeholder`
- select prompt 的 `options[].id/label/description`
- outcome 的 `status`

如果 DSH 修改 Authorization 的 prompt/outcome 结构、取消语义、并发限制或凭据落盘职责，必须重新审计本插件，不能只看语法检查是否通过。

### Web Slot contract

客户端通过 classic-script `window.__ModuleLoader__.load(...)` 加载，并依赖：

- Client services：`slots`、`timer`
- Slot：`settings.models.footer`
- 注册 ID：`dsh-codex-login`
- order：`-10`

这些 ID / order / Slot 位置属于现有 UI 行为，不因兼容升级随意调整。

## 行为契约

- OAuth key 固定为 `llm-pi-ai/openai-codex`，流程必须来自 DSH Authorization registry。
- 同一时间只允许复用一个 running attempt，不能因为 API 变化引入并行 OAuth 流程。
- Web 只投影 notice/prompt/status/error 所需字段，不把 DSH 内部对象直接透传到浏览器。
- 插件卸载时必须释放所有 Web routes；尚在运行的授权流程必须取消。
- 本插件不自行实现 Credentials store，不复制 DSH 的凭据持久化逻辑。

## DSH 升级重点

上游出现以下变化时优先检查本插件：

- `dsh-authorization` API 或交互协议；
- Authorization / Credentials 生命周期；
- Web Server route 注册/释放；
- Client ModuleLoader；
- `settings.models.footer` Slot 或 settings models UI；
- Plugin Manager 的加载、卸载或 HMR 生命周期。
