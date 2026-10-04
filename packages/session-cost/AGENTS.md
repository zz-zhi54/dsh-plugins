# AGENTS.md

## 范围

本文件适用于 `packages/session-cost`。根目录 `AGENTS.md` 的全局规则同时生效。

该插件通过 host-only Session projection 增量折叠持久事件，按 provider/model 计算当前 Session 的 USD 费用，并在 Web composer 下方以独立 Slot 展示。

## DSH 依赖面

### Packages / Client module

- `@deepseek-ai/dsh-session`
- `@deepseek-ai/dsh-session-projection`
- Web client 注入 `@deepseek-ai/dsh-client-ui-conversation`

### Host Services / APIs

- `sessions.get(sessionId)`
- Session 对象的 `seq`
- `sessionProjections.register(definition)`
- `sessionProjections.stateOf(session, key)`
- `webServer.register(...)`
- `ctx.effect(...)`

### Projection contract

注册的 projection definition 使用：

- `key: 'sessionCost'`
- `stateVersion`
- `stateSchema`
- `init(state)`
- `apply(state, event)`

DSH 修改 projection definition、schema 验证、stateOf/register 生命周期、缓存/重放语义时必须重新审计。

### Durable Session event contract

费用折叠明确依赖这些持久事件及字段：

- `request/header`
  - `data.header` 中的 model route
- `assistant/message`
  - `data.usage`
  - `data.message.source.kind/provider/model`
- `assistant/attempt`
  - `data.stream` 中最后一个 `type: 'usage'` chunk

这三类事件的名称、字段、usage 单位、route 来源或提交时机发生变化，都可能造成“代码仍能运行但费用静默错误”，必须按语义检查。

### Web Slot contract

客户端依赖：

- Client service：`slots`
- Slot：`conversation.composer.dock`
- 注册 ID：`session-cost`
- order：`10`

当前 Desktop DSH `0.2.0-rc.2` 使用内置 stats（order `0`）。本插件继续使用独立 `session-cost`（order `10`），不得占用、替换或复制内置统计；`codex-usage` 使用 order `20`。上游后续 Slot 变化只有进入 Desktop runtime 后才调整本兼容基线。

## 行为契约

- 费用只从 durable Session events 增量计算，不新增本插件自己的持久化。
- 使用 Session `seq` 作为进程内缓存失效依据；不能把缓存变成独立事实源。
- 未识别价格允许返回 partial/unknown，不能凭空估价。
- Host API 只返回聚合后的费用/Token 结果，不暴露 Session 内部对象。
- UI 必须作为独立 Slot 附加，不改变 DSH 内置 stats 的结构、样式和交互。

## DSH 升级重点

上游出现以下变化时优先检查本插件：

- Session event schema / persistence version；
- `request/header`、`assistant/message`、`assistant/attempt`；
- Session `seq`；
- Session registry；
- Session Projection API / replay lifecycle；
- `conversation.composer.dock` 与内置 stats Slot；
- Client ModuleLoader / Plugin Manager 生命周期。
