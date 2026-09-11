# dsh-codex-usage-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

在 DSH Web 输入框下方显示 Codex 的 5 小时与每周剩余额度，以及各自还有多久刷新。数据来自 DSH 自己的 Codex 凭据，不依赖 codex CLI。

![Codex 用量显示在输入框下方](assets/codex-usage-pill.jpg)

## 功能

- **位置**：注册在 `conversation.composer.dock`，`id: codex-usage`、`order: 20` —— 排在内置 `stats`（`order: 0`）和 Session 费用（`order: 10`）下面一行，同一套居中排版。
- **收起态就是全部信息**，没有悬浮面板：
  `Codex · 5h 剩 93% · 2 小时 41 分后刷新 · 周 剩 66% · 4 天 3 小时后刷新`
  余量越少越醒目：已用 ≥75% 转警告色，≥90% 转错误色。
- **交互**：点击强制刷新，绕过 Host 的 60s 缓存；悬浮只做背景反馈。
- **刷新**：挂载时一次，之后每 5 分钟一次；倒计时每 30s 重绘一次。
- **失败暂停**：连续 3 次失败后**停止自动轮询**，pill 变成 `Codex 额度已暂停 · 点击重试`；点击重试成功即恢复 5 分钟轮询，仍失败则继续暂停。失败时不会一直打上游。
- **降级**：失败态与暂停态都只占一行灰字（本身就是重试按钮），具体原因在 `title` 里，不影响界面其它部分。
- **与 Session 费用插件并装**：三者都位于 `conversation.composer.dock`；DSH 内置 `stats` 保持 `order: 0`，Session 费用插件使用独立的 `session-cost`（`order: 10`）条目，本插件使用独立的 `codex-usage`（`order: 20`）条目，按当前 DSH Slot 契约可同时安装。

## 数据来源

一次 `GET https://chatgpt.com/backend-api/wham/usage`，凭据取自 DSH credentials store 中的 `llm-pi-ai/openai-codex` 记录（由 [`codex-login`](../codex-login/README.md) 或 DSH 自身的登录流程写入）。

不读 `~/.codex`，不运行 codex CLI，也不占用 DSH 的模型调用。

## 安全边界

完整清单写在 `src/codex-usage.mjs` 文件头，改动前必读。要点：

- **access token 只出现在发往上游的请求头里**：不写日志、不进错误信息、不进 HTTP 响应、不落盘。
- 所有对外错误文本先经 `redact()` 脱敏。脱敏**不只覆盖 token**：`Bearer` 值、`access_token` / `refresh_token` / `access` / `refresh` 字段，以及 `email` / `user_id` / `account_id`（snake_case 与 camelCase）都要掩掉，并用邮箱形态兜底；同时保留错误码等排障信息。
- `wham/usage` 原始响应含 `email` / `user_id` / `account_id`；只允许 `projectUsagePayload()` 投影后的标量字段离开 Host，浏览器侧只有百分比、窗口长度、重置时刻、套餐、时间戳。
- **本插件注册的 `/api/codex-usage` 不在 DSH 的浏览器信任栅栏内**（该栅栏是 `dsh-client-connection` 的私有逻辑，只守它自己的 RPC 通道）。因此这条路由只允许返回投影后的额度标量 —— 不要把凭据或身份信息加进来。
- **本插件绝不刷新凭据**，连 `refresh` 字段都不读。pi-ai 的刷新发生在 `credentials.modifyRecord()` 内部；`dsh-llm-pi-ai` 的 `credentialStoreFrom()` 注释明确警告，两个进程并发轮换同一个 refresh token 会丢掉先写入的那一份。凭据过期时直接提示重新登录或在 DSH 里用一次 Codex。

`test/codex-usage.test.mjs` 里有对应的回归测试：正常路径的返回值不得包含 token，401 的原因必须已脱敏，**失败原因不得出现上游的 email / user_id / account_id**，凭据过期时不得发出任何请求。

## 请求对齐依据

请求特征与 DSH pi-ai 保持一致。pi / pi-ai 更新时按这张表同步；同一张表也写在 `src/codex-usage.mjs` 文件头，便于对照：

| 项目 | 来源与位置 |
| --- | --- |
| 端点 | `@narumitw/pi-codex-usage` `src/query.ts:55` → `https://chatgpt.com/backend-api/wham/usage` |
| 请求头 | `@earendil-works/pi-ai` `dist/api/openai-codex-responses.js:1262` → `buildBaseCodexHeaders()` |
| User-Agent | `@earendil-works/pi-ai` `dist/utils/pi-user-agent.js:9` → `` `pi (${os.platform()} ${os.release()}; ${os.arch()})` `` |
| 响应字段 | `@narumitw/pi-codex-usage` `src/normalize.ts` → `rate_limit.primary_window` / `secondary_window` / `plan_type` |
| 脱敏写法 | `@narumitw/pi-codex-usage` `src/query.ts:162` → `redactErrorBody()` |
| 凭据来源 | pi 用 pi-coding-agent 的 `readStoredCredential()`；DSH 的对应物是 `ctx.credentials.readRecord()` |

实际发送的头：`authorization`、`originator`、`user-agent`、`accept: application/json`；凭据包含账号 ID 时才额外发送 `chatgpt-account-id`。

pi-ai 另有一组 SSE 专有头（`OpenAI-Beta`、`accept: text/event-stream`、`content-type`、`session-id`、`x-client-request-id`），只用于 POST `/codex/responses` 流式请求；本插件查询用量走 GET，因此不带。

`originator` 与 `User-Agent` 都取 pi-ai 的值，以保证本插件与 DSH 自身 Codex 流量的请求特征一致。这是刻意的对齐决定，不是代码复用 —— 本插件对 DSH 与 pi 都没有任何代码依赖。

## 安装

直接从 GitHub 安装当前分支：

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/codex-usage'
```

固定 release 时，将路径替换为 `#v<version>&path:packages/codex-usage`。

该 package 自己的 patch 只插入一个 Profile 条目：

- `codex-usage`：本插件的 Host 路由和 Web 客户端。

卸载：

```sh
dsh plugin --profile web remove dsh-codex-usage-plugin
```

## 验证

```sh
pnpm --filter dsh-codex-usage-plugin run check
pnpm --filter dsh-codex-usage-plugin run test
dsh --profile web --dump-config
```

`--dump-config` 应出现 `codex-usage`。真实额度取决于本机 DSH 是否已有 Codex 登录，静态检查与单元测试不能替代运行时验证。

## 限制

- **端点未公开。** `wham/usage` 不在官方文档里（社区实现与 codex CLI 都在使用同一路径），路径或响应字段可能变化。变化时会走到归一化的失败分支，界面显示灰色不可用而不是崩溃。
- **依赖 DSH 侧的 Codex 登录。** 凭据 JWT 约 10 天过期，过期且尚未刷新时不可用；在 DSH 里用一次 Codex 会触发刷新。
- 只查询自己账号的额度，不做账号切换，也不读取 `additional_rate_limits` 里的其它计费桶。
- **三端一致**：使用 Node 内置 `fetch`，不依赖 `curl` 或任何外部二进制，macOS / Linux / Windows 行为相同。
- 未来如果要显示"重置券 N 张"，需要先让 `projectUsagePayload()` 投影并测试 `rate_limit_reset_credits.available_count`；当前投影没有保留该字段。`planType` 与 `fetchedAt` 已保留，如需显示"套餐 / 更新时间"，只需在收起态那一行补文案。

## 实现约束

- `src/codex-usage.mjs`：纯逻辑（凭据读取、请求构造、响应投影、脱敏），可脱离 DSH 测试。
- `src/host.mjs`：只依赖 `webServer`（必需）与 `credentials`（可选）。注册 `GET /api/codex-usage`，60s 缓存 + 单飞；无论成功失败都回 200，失败语义在响应体的 `ok` 字段里。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，不是普通 ESM；修改时必须保留 `window.__ModuleLoader__.load({ id, factory })` 与 `require('react')` 的结构。样式全部内联，不向 `document` 注入全局 CSS。
