# dsh-session-cost-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

在 DSH Web 输入框下方的 Token 统计行显示当前会话费用。费用使用模型 provider 报告的每次请求 usage，并按 `provider/model` 分组；价格来自 `@earendil-works/pi-ai` 内置模型目录，原生显示 USD。

## 功能

- **位置**：接管 `conversation.composer.dock` 的内置 `stats` 单元，在原有时间 / Token pill 同一行追加 `费用 $0.0124`；这样费用不会落到下一行。
- **交互**：点击费用打开 Token 费用统计对话框；每个 `provider/model` 行显示 Token 总数和费用，点击后展开 input、output、cache read、cache write 与请求次数。
- **数据来源**：每次读取都从当前 Session 的 durable events 重算，不新增持久化文件；Host 只按 Session `seq` 做进程内缓存。
- **请求覆盖**：成功的 `assistant/message` 和没有 surface message 的 `assistant/attempt` 都计入。重试 attempt 从其 durable stream 的最后一条 provider usage 读取，不把流式中间 usage 重复相加。
- **未知价格**：模型不在 pi-ai 内置目录时显示 `未知`，不会猜测价格；已知模型的费用仍会显示，并标记未知部分。

## 安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/session-cost
```

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
- 本插件复用 DSH 的 `stats` Slot 单元来保持同一行，因此应与对应 DSH Web 版本一起使用；停止或卸载插件会移除替换的 Slot 注册和 Host 路由。

## 实现约束

- `src/cost.mjs` 只读取 durable event 的标量字段，调用 `getBuiltinModel()` / `calculateCost()`，不保存 Session 或模型对象。
- `src/host.mjs` 注册 `GET /api/session-cost`，响应只包含当前会话的投影数据，不返回原始事件。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，必须保留 `window.__ModuleLoader__.load({ id, factory })` 与 `require('react')` 的结构；样式全部内联，不向 `document` 注入全局 CSS。
