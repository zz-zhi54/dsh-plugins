# dsh-session-cost-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

在 DSH Web 输入框下方的 Token 统计行显示当前会话费用。费用使用模型 provider 报告的每次请求 usage，并按 `provider/model` 分组；价格来自 `@earendil-works/pi-ai` 内置模型目录，原生显示 USD。

## 功能

- **位置**：注册独立的 `conversation.composer.dock` 条目 `session-cost`（`order: 10`），在 DSH 内置 `stats`（`order: 0`）之后显示 `费用 $0.0124`；不接管或替换内置统计单元。
- **交互**：点击费用打开 Token 费用统计对话框；每个 `provider/model` 行显示 Token 总数和费用，点击后展开 input、output、cache read、cache write 与请求次数。
- **数据来源**：每次读取都从当前 Session 的 durable events 重算，不新增持久化文件；Host 只按 Session `seq` 做进程内缓存。
- **请求覆盖**：成功的 `assistant/message` 和没有 surface message 的 `assistant/attempt` 都计入。重试 attempt 从其 durable stream 的最后一条 provider usage 读取，不把流式中间 usage 重复相加。
- **未知价格**：模型不在 pi-ai 内置目录时显示 `未知`，不会猜测价格；已知模型的费用仍会显示，并标记未知部分。
- **与 Codex 用量插件并装**：三者都位于 `conversation.composer.dock`；DSH 内置 `stats` 保持 `order: 0`，本插件使用独立的 `session-cost`（`order: 10`），Codex 用量插件使用 `codex-usage`（`order: 20`），按当前 DSH Slot 契约可同时安装。

## 安装

默认组合 `dsh-default` 已包含本插件；如果只需要 Session 费用，也可以在 Monorepo 根目录按需单独安装：

```sh
dsh plugin --profile web add ./packages/session-cost
```

使用默认组合时不要再单独安装本插件，否则可能重复插入 `session-cost` Profile 条目。

该 package 的 patch 插入一个 Profile 条目：

- `session-cost`：本插件的 Host 路由和 Web 客户端。

卸载：

```sh
dsh plugin --profile web remove dsh-session-cost-plugin
```

## 验证

```sh
pnpm --filter dsh-session-cost-plugin run check
pnpm --filter dsh-session-cost-plugin run test
dsh --profile web --dump-config
```

`--dump-config` 应出现 `session-cost`。需要至少有一次带 provider usage 的模型请求后，费用 pill 才会出现。

## 限制

- 费用是基于当前 pi-ai 价格目录的估算；价格目录更新后，重新读取会按新价格计算历史 usage。
- provider 没有报告 usage 的请求不会被计费；没有可验证价格的 `provider/model` 不会被赋予默认价格。
- 本插件使用独立的 `session-cost` Slot（`order: 10`），不会替换 DSH 的 `stats`；它应与对应 DSH Web 版本一起使用。停止或卸载插件只会移除费用 Slot 注册和 Host 路由，不影响内置统计。
- `@earendil-works/pi-ai@0.85.1` 要求 Node `>=22.19.0`；使用本插件时请使用满足该要求的 Node 版本。

## 实现约束

- `src/cost.mjs` 只读取 durable event 的标量字段，调用 `getBuiltinModel()` / `calculateCost()`，不保存 Session 或模型对象。
- `src/host.mjs` 注册 `GET /api/session-cost?sessionId=<id>`，响应只包含当前会话的投影数据，不返回原始事件；Host 以 Session `seq` 缓存同一会话的结果。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，必须保留 `window.__ModuleLoader__.load({ id, factory })` 与 `require('react')` 的结构；样式全部内联，不向 `document` 注入全局 CSS。
