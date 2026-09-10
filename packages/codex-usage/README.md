# dsh-codex-usage-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

在 DSH Web 输入框下方显示 Codex 的 5 小时与每周额度：已用、剩余，以及各自的重置倒计时。数据来自 DSH 自己的 Codex 凭据，不依赖 codex CLI。

## 功能

- **位置**：注册在 `conversation.composer.dock`，`id: codex-usage`、`order: 1` —— 内置用量 pill（`id: stats`，order 0）下面一行，同一套居中排版。
- **收起态**：`Codex · 5h 用 7% 剩 93% · 周 用 34% 剩 66%`。已用 ≥75% 转警告色，≥90% 转错误色。
- **悬浮态**：每个窗口的已用/剩余、重置倒计时与重置时刻，另有套餐与更新时间。
- **交互**：悬浮展开、移开收起（键盘 focus/blur 同样处理）；点击强制刷新，绕过 Host 的 60s 缓存。
- **刷新**：挂载时一次，之后每 5 分钟一次；倒计时每 30s 重绘一次。
- **降级**：取不到数据时只显示一行灰色 `Codex 额度不可用`，具体原因在 `title` 里，不影响界面其它部分。

## 数据来源

一次 `GET https://chatgpt.com/backend-api/wham/usage`，凭据取自 DSH credentials store 中的 `llm-pi-ai/openai-codex` 记录（由 [`codex-login`](../codex-login/README.md) 或 DSH 自身的登录流程写入）。

不读 `~/.codex`，不运行 codex CLI，也不占用 DSH 的模型调用。

## 安全边界

完整清单写在 `src/codex-usage.mjs` 文件头，改动前必读。要点：

- **access token 只出现在发往上游的请求头里**：不写日志、不进错误信息、不进 HTTP 响应、不落盘。
- 所有对外错误文本先经 `redact()` 脱敏（`Bearer` 值与常见 token 字段名），未脱敏的上游原文不得离开 Host。
- `wham/usage` 原始响应含 `email` / `user_id` / `account_id`；只允许 `projectUsagePayload()` 投影后的标量字段离开 Host，浏览器侧只有百分比、窗口长度、重置时刻、套餐、时间戳。
- **本插件绝不刷新凭据**，连 `refresh` 字段都不读。pi-ai 的刷新发生在 `credentials.modifyRecord()` 内部；`dsh-llm-pi-ai` 的 `credentialStoreFrom()` 注释明确警告，两个进程并发轮换同一个 refresh token 会丢掉先写入的那一份。凭据过期时直接提示重新登录或在 DSH 里用一次 Codex。

`test/codex-usage.test.mjs` 里有对应的回归测试：正常路径的返回值不得包含 token，401 的原因必须已脱敏，凭据过期时不得发出任何请求。

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

实际发送的头：`authorization`、`chatgpt-account-id`、`originator`、`user-agent`、`accept: application/json`。

pi-ai 另有一组 SSE 专有头（`OpenAI-Beta`、`accept: text/event-stream`、`content-type`、`session-id`、`x-client-request-id`），只用于 POST `/codex/responses` 流式请求；本插件查询用量走 GET，因此不带。

`originator` 与 `User-Agent` 都取 pi-ai 的值，以保证本插件与 DSH 自身 Codex 流量的请求特征一致。这是刻意的对齐决定，不是代码复用 —— 本插件对 DSH 与 pi 都没有任何代码依赖。

## 安装

不属于默认的 `dsh-plugins` Bundle，按需安装。在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/codex-usage
```

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
- 未来如果要在悬浮面板里显示"重置券 N 张"，`wham/usage` 响应已经带回 `rate_limit_reset_credits.available_count`，只需在 `projectUsagePayload()` 里多加一个字段。

## 实现约束

- `src/codex-usage.mjs`：纯逻辑（凭据读取、请求构造、响应投影、脱敏），可脱离 DSH 测试。
- `src/host.mjs`：只依赖 `webServer`（必需）与 `credentials`（可选）。注册 `GET /api/codex-usage`，60s 缓存 + 单飞；无论成功失败都回 200，失败语义在响应体的 `ok` 字段里。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，不是普通 ESM；修改时必须保留 `window.__ModuleLoader__.load({ id, factory })` 与 `require('react')` 的结构。样式全部内联，不向 `document` 注入全局 CSS。
