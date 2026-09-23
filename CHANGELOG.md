# Changelog

本文件记录 `dsh-plugins` 的插件版本，以及每个版本对应的 DeepSeek Harness 官方版本。

版本格式为 `DSH 版本.插件修订号`：

- `0.1.5-alpha.2.1`：基于 DSH `0.1.5-alpha.2` 的第一个插件修订版。
- 同一 DSH 版本下继续修复或改进插件时，递增最后的插件修订号。
- 切换到新的 DSH 版本时，更新 DSH 版本部分，并将插件修订号从 `.1` 重新开始。

## Unreleased

## 0.1.7-alpha.2.1 — 2026-09-23

**对应 DSH 官方标签：** `dsh-v0.1.7-alpha.2`

**对应本仓库标签：** `v0.1.7-alpha.2.1`

### 兼容性

- 审计 DSH `dsh-v0.1.7-alpha.1` 到 `dsh-v0.1.7-alpha.2` 的官方发布说明与相关源码差异；本次上游主要是会话滚动与历史跳转、代码块与 Excel 预览、后台任务唤醒、安装体验及 MCP 工具结果预算优化。
- `session/event` 的监听签名与 `turn/end`、`approval/asked` 事件仍兼容；`sessionProjections.register()` / `stateOf()`、`authorization`、`webServer` 以及现有 Host 生命周期接入方式未发生破坏性变化。
- `conversation.composer.dock`、`settings.models.footer` 仍是独立 list Slot，`id` / `order` 注册契约保持不变；继续保留 DSH 内置 `stats`，不改动现有插件注册 ID 和顺序。
- MCP Client 的上游内部工具结果投影发生调整，但 `Config`、Agent 作用域挂载和连接配置接口未变；`project-mcp` 不使用上游变更的工具结果内部 API，无需运行时适配。

### 同步

- 根目录与五个插件 manifest 版本同步为 `0.1.7-alpha.2.1`。
- `codex-login`、`project-mcp`、`session-cost`、`system-notification` 的直接 DSH 依赖和最低发布年龄放行条目同步到 `0.1.7-alpha.2`；Cordis、Cosmokit、Schemastery 同步到官方 `4.0.4`、`1.8.5`、`3.18.4`。
- 重新生成 pnpm 锁文件，并更新根 README 的兼容版本、安装示例和元数据。

## 0.1.7-alpha.1.1 — 2026-09-22

**对应 DSH 官方标签：** `dsh-v0.1.7-alpha.1`

**对应本仓库标签：** `v0.1.7-alpha.1.1`

### 兼容性

- 审计 DSH `dsh-v0.1.6-alpha.2` 到 `dsh-v0.1.7-alpha.1` 的官方发布说明与相关源码差异；本次上游主要是会话管理、设置、任务后台运行、文件预览和安装体验优化。
- `session/event` 的监听签名与 `turn/end`、`approval/asked` 事件仍兼容；`session-cost` 使用的 `sessionProjections.register()` / `stateOf()` 以及现有 host-only 投影没有变化。
- `conversation.composer.dock`、`settings.models.footer` 仍是独立 list Slot，`id` / `order` 注册契约保持不变；继续保留 DSH 内置 `stats`，不改动现有插件注册 ID 和顺序。
- `authorization`、`credentials`、`webServer` 与项目 MCP 使用的 Agent 生命周期接入方式保持兼容；无需运行时适配。

### 同步

- 根目录与五个插件 manifest 版本同步为 `0.1.7-alpha.1.1`。
- `codex-login`、`project-mcp`、`session-cost`、`system-notification` 的直接 DSH 依赖、最低发布年龄放行条目和锁文件同步到 `0.1.7-alpha.1`。

## 0.1.6-alpha.2.4 — 2026-09-21

**对应 DSH 官方标签：** `dsh-v0.1.6-alpha.2`

**对应本仓库标签：** `v0.1.6-alpha.2.4`

### 修复

- 修复 Session 费用对话框打开后点击其它区域无法关闭的问题，使其与 DSH 内置 `stats` 的外部点击关闭行为一致。

### 兼容性

- 继续兼容 DSH `0.1.6-alpha.2`；保持现有 Slot 注册 ID、顺序和 Host 依赖不变。

## 0.1.6-alpha.2.3 — 2026-09-18

**对应 DSH 官方标签：** `dsh-v0.1.6-alpha.2`

**对应本仓库标签：** `v0.1.6-alpha.2.3`

### 修复

- 修复 composer dock 中 Session 费用和 Codex 额度条目因额外垂直 padding 导致的视觉下移，使其与 DSH 内置 `stats` 对齐。

### 文档

- 简化发布 PR 的操作说明。

### 兼容性

- 继续兼容 DSH `0.1.6-alpha.2`；保持现有 Slot 注册 ID、顺序和 Host 依赖不变。

## 0.1.6-alpha.2.2 — 2026-09-18

**对应 DSH 官方标签：** `dsh-v0.1.6-alpha.2`

**对应本仓库标签：** `v0.1.6-alpha.2.2`

### 修复

- 统一 composer dock 中 Session 费用和 Codex 额度条目的外层间距，移除额外的 auto margin 和水平 padding，交由 dock 使用默认间隔。
- 将 Codex 额度显示改为紧凑英文单位：窗口使用 `h / w`，重置倒计时使用 `d / h / m`；移除“剩”“后刷新”和秒数文案。
- 使用公开的主题 token 显示 Codex 分隔点，避免分隔点因未声明的 token 隐形。

### 兼容性

- 继续兼容 DSH `0.1.6-alpha.2`；本次没有改变 Slot 注册 ID、顺序或 Host 依赖。

## 0.1.6-alpha.2.1 — 2026-09-18

**对应 DSH 官方标签：** `dsh-v0.1.6-alpha.2`

**对应本仓库标签：** `v0.1.6-alpha.2.1`

### 修复

- 修复 DSH alpha.2 的 composer dock 横向布局下，Session 费用和 Codex 额度条目占满整行导致内置统计项被压缩成省略号的问题；两个条目现在只占用自身内容宽度，保留内置 `stats` 的显示。
- 更新 Session 费用和 Codex 额度插件 README 使用的界面截图，使其反映当前布局。

### 兼容性

- 将根目录与五个插件 manifest、直接 Host peer/devDependencies、以及最低发布年龄放行条目同步到 DSH `0.1.6-alpha.2`。
- `conversation.composer.dock` 与 `settings.models.footer` 的现有 Slot 契约保持兼容；无需替换内置 `stats` 或改变插件注册 ID / 顺序。

## 0.1.6-alpha.1.1 — 2026-09-15

**对应 DSH 官方标签：** `dsh-v0.1.6-alpha.1`

**对应本仓库标签：** `v0.1.6-alpha.1.1`、`v0.1.6-alpha.1.1`

### 兼容性

- 将五个插件版本、直接 Host peerDependencies、最低发布年龄放行条目和锁文件同步到 DSH `0.1.6-alpha.1`。
- 对比官方发布差异：Authorization、WebServer、`session/event` 事件以及本仓库使用的 `conversation.composer.dock`、`settings.models.footer` 槽位契约未发生破坏性变化，`codex-login`、`codex-usage` 和 `system-notification` 无需修改运行时实现。
- DSH 的 Session 任意历史同步读取 API 现标记为 deprecated；`session-cost` 改用 host-only `sessionProjections` 投影保存归一化 usage 与 provider/model 路由，移除新增生产代码对 `snapshotEvents()` 的依赖。
- 官方 MCP Client 升级到 MCP SDK v2；`project-mcp` 使用的配置字段和 `agent.ctx.plugin()` 接入方式仍兼容，并自动获得协议协商、工具分页、断线重连及资源读取能力。旧服务器的非标准工具结果或超过默认 32 KiB instructions 限制时，可能被官方客户端拒绝；stdio 服务器还会经历一次临时 probe 启动和回收，存在启动副作用或不支持短时间双启动的服务器需要单独验证；literal server instructions 依赖新版 `system-prompt` 配套组合，混用旧版 system-prompt 时需单独验证；插件仍保持错误隔离。

## 0.1.5-rc.2.5 — 2026-09-14

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.2`

**对应本仓库标签：** `v0.1.5-rc.2.5`、`v0.1.5-rc.2.5`

### 项目级 MCP

- 为每个 Agent 的项目 MCP 生成唯一运行时 `serverName`，避免多个 Agent 的 MCP 实例冲突，并跳过同一项目配置中的重复名称。
- 配置、schema 或首次连接失败时记录 `console.error`，不阻断 Agent 创建、首步或后续流程；`agent/pre-step` 仍等待挂载完成，单个配置项失败不影响同一项目的其他 MCP。

## 0.1.5-rc.2.4 — 2026-09-14

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.2`

**对应本仓库标签：** `v0.1.5-rc.2.4`、`v0.1.5-rc.2.4`

### 项目级 MCP

- 将项目 MCP 的异步启动 Promise 保存到对应 Agent，并在 `agent/pre-step` 中等待完成后再继续，避免首步早于 MCP 初始化。
- 仅响应插件加载后的 `agent/created`；不扫描已有 Agent，也不在 Profile/HMR 重载时补挂载项目 MCP。

## 0.1.5-rc.2.3 — 2026-09-14

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.2`

**对应本仓库标签：** `v0.1.5-rc.2.3`、`v0.1.5-rc.2.3`

### 项目级 MCP

- 新增 `packages/project-mcp`（`dsh-project-mcp-plugin`）：按每个 Agent Session 的项目 `cwd` 读取 `.dsh/mcp.yml`，为该 Agent 加载隔离的项目级 MCP。
- 支持 `stdio` 和 `streamable-http` 配置；项目级 MCP 的工具注册与连接生命周期不跨 Agent 共享，全局 MCP 保持不变。
- 项目配置、schema 或首次连接失败时保持启动失败语义，不降级为 warning；stdio 未指定 `cwd` 时使用项目目录。

## 0.1.5-rc.2.2 — 2026-09-11

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.2`

**对应本仓库标签：** `v0.1.5-rc.2.2`、`v0.1.5-rc.2.2`

### 安装与发布

- 移除组合 pack，改为从 GitHub `packages/*` 子目录按需安装、更新和卸载单个插件。
- 发布脚本只创建规范的 `v<version>` 标签，安装命令使用同一标签。

## 0.1.5-rc.2.1 — 2026-09-11

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.2`

**对应本仓库标签：** `v0.1.5-rc.2.1`

### 兼容性

- 将插件依赖、Host peerDependencies、最低发布年龄放行条目和锁文件同步到 DSH `0.1.5-rc.2`。
- 对比 DSH `0.1.5-rc.1` 到 `0.1.5-rc.2` 的相关 Session、Authorization、WebServer 和 Web UI 契约，未发现需要源码适配的变化。

## 0.1.5-rc.1.7 — 2026-09-11

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.7`

### 工作区与组合

- 移除已废弃的 `packages/init` 插件。
- 将组合目录从 `bundles/` 重命名为 `packs/`。
- 新增 `dsh-default` 默认组合（显式启用 `system-notification` 和 `session-cost`）和 `dsh-codex` Codex 组合；组合 patch 显式插入组件，不依赖递归激活。

### Codex 用量

- 连续 3 次请求失败后暂停自动轮询，失败态改为可点击的手动重试；手动重试成功后恢复轮询。
- 脱敏补齐 `email`、`user_id`、`account_id` 等身份字段，并修复手动重试状态清理问题。

### Session 费用

- 新增 `packages/session-cost`（`dsh-session-cost-plugin`）：在 DSH 内置 Token 统计下方独立显示按 `provider/model` 分组的 USD 费用。
- 费用从 durable Session events 的 provider usage 重算，成功消息和无 surface message 的 retry attempt 均覆盖；模型价格只使用 `@earendil-works/pi-ai` 内置目录，未知模型不猜价。
- 点击费用可展开 Token / cache 明细与每个模型的费用；不增加额外持久化。
- 使用独立的 `session-cost` composer slot（`order: 10`），保留 DSH 内置 `stats` 及 Codex 用量 slot。
- 补充 Session 费用 pill、费用对话框收起/展开态截图，并将截图资源随插件包发布。

## 0.1.5-rc.1.6 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.6`

### 文档

- `packages/codex-usage` 补充界面截图 `assets/codex-usage-pill.jpg`，并把 `assets` 纳入 `files`，保证截图随包发布。
- 该包介绍文案改为"剩余额度 + 还有多久刷新"，与收起态实际显示一致。

## 0.1.5-rc.1.5 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.5`

### 修复

- 补齐 `pnpm-lock.yaml` 中 `packages/codex-usage` 的 importer 条目。该包没有任何依赖，普通 `pnpm install` 因此不会为空包写入 importer，但 `pnpm install --frozen-lockfile` 要求每个工作区项目都有条目，会报 `ERR_PNPM_PACKAGE_MANAGER_NO_IMPORTER`。补上后 frozen 安装通过，条目也不会再漂移。
- 除该锁文件条目外，`0.1.5-rc.1.4` 的插件内容不变。

## 0.1.5-rc.1.4 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.4`

### 新增：Codex 用量插件

- 新增按需插件 `packages/codex-usage`（`dsh-codex-usage-plugin`）：在 Web 输入框下方显示 Codex 的 5 小时与每周额度。收起态即全部信息，没有悬浮面板：
  `Codex · 5h 剩 93% · 2 小时 41 分后刷新 · 周 剩 66% · 4 天 3 小时后刷新`。
- 凭据取自 DSH credentials store 的 `llm-pi-ai/openai-codex`，只读且不刷新；不依赖 codex CLI，也不读取 `~/.codex`。凭据按次惰性解析，避免 Cordis 服务就绪竞态。
- 请求特征（端点 `wham/usage`、请求头、User-Agent、响应字段、脱敏写法）与 DSH pi-ai 及 pi 生态实现对齐；对齐表同时记录在该包 README 与 `src/codex-usage.mjs` 文件头，便于上游更新时同步。
- 安全边界：access token 只出现在发往上游的请求头里；对外错误文本一律脱敏；上游响应中的 `email` / `user_id` / `account_id` 不离开 Host。21 项单元测试覆盖投影、脱敏、凭据解析与客户端契约。
- 该插件不属于默认组合，按需安装：`dsh plugin --profile web add ./packages/codex-usage`。

## 0.1.5-rc.1.3 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.3`

### 系统通知

- Windows 原生通知改用 DSH 官方 favicon 生成的多尺寸 `dsh.ico`，替换系统默认信息图标。
- 将 Windows 图标资源纳入插件包发布内容，并补充 PowerShell 路径转义测试。
- macOS 继续使用系统原生通知；`osascript` 接口不支持指定自定义通知图标。

## 0.1.5-rc.1.2 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `v0.1.5-rc.1.2`

### 兼容性

- 将插件直接使用的 DSH 依赖、Host peerDependencies 和最低发布年龄放行条目同步到 `0.1.5-rc.1`，并重新生成锁文件。
- 对比官方 `0.1.5-alpha.2` 到 `0.1.5-rc.1` 的相关源码，三个 Host 插件使用的 Service、Event、命令、Web 路由以及 Codex Web classic-script/Slot 契约均未变化，因此无需源码适配。
- RC 的默认模型 ID 从 `deepseek-v4-flash` 切换为 `deepseek-flash`，本仓库未硬编码该模型 ID，无需调整。

### 系统通知

- 完成通知简化为监听 `turn/end` 的 `completed` 结果；审批通知继续监听 `approval/asked`。

## 0.1.5-alpha.2.2 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-alpha.2`

**对应本仓库标签：** `v0.1.5-alpha.2.2`

### 依赖与开发体验

- 将 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent` 和 `@deepseek-ai/dsh-session` 声明为 system-notification 的 Host `peerDependencies`。
- 将同一组包加入 `devDependencies`，便于本地 IDE、测试和源码导航；运行时仍由 DSH Host 提供，不会复制安装。
- 在 system-notification README 中补充 `Context.on` 的 DSH Cordis 源码链接。

## 0.1.5-alpha.2.1 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-alpha.2`

**对应本仓库标签：** `v0.1.5-alpha.2.1`

### 默认组合

- 默认组合只启用 `system-notification`。
- `codex-login` 不再由默认组合激活，避免首次登录以外的长期依赖。

### Codex 登录

- 保留临时的 ChatGPT / Codex OAuth Web 登录入口。
- 目标凭据为 `llm-pi-ai/openai-codex`。
- OAuth 成功并由 DSH credentials store 持久化后即可卸载该插件。
- 明确该插件不是新的 Codex Provider，也不是完整的 OpenAI Codex 实现。

### 系统通知

- 发送 macOS / Windows 原生任务完成和审批请求通知。
- 保持旁路观察设计，不接管 Agent 或审批流程。
- 记录并披露 in-process Subagent / Agent Teams 子 Agent 可能产生额外通知的行为。

### 兼容性与文档

- DSH 依赖统一更新并固定到 `0.1.5-alpha.2`。
- 删除 system-notification 未使用的旧版 DSH 依赖。
- 补充非官方、源码安装、npm 未发布和当前限制说明。

此前的仓库提交尚未使用正式插件版本标签，因此不在此处追溯分配版本号。
