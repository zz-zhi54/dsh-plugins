# Changelog

本文件记录 `dsh-plugins` 的插件版本，以及每个版本对应的 DeepSeek Harness 官方版本。

版本格式为 `DSH 版本.插件修订号`：

- `0.1.5-alpha.2.1`：基于 DSH `0.1.5-alpha.2` 的第一个插件修订版。
- 同一 DSH 版本下继续修复或改进插件时，递增最后的插件修订号。
- 切换到新的 DSH 版本时，更新 DSH 版本部分，并将插件修订号从 `.1` 重新开始。

## 0.1.5-rc.1.5 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `dsh-plugins-v0.1.5-rc.1.5`

### 修复

- 补齐 `pnpm-lock.yaml` 中 `packages/codex-usage` 的 importer 条目。该包没有任何依赖，普通 `pnpm install` 因此不会为空包写入 importer，但 `pnpm install --frozen-lockfile` 要求每个工作区项目都有条目，会报 `ERR_PNPM_PACKAGE_MANAGER_NO_IMPORTER`。补上后 frozen 安装通过，条目也不会再漂移。
- 除该锁文件条目外，`0.1.5-rc.1.4` 的插件内容不变。

## 0.1.5-rc.1.4 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `dsh-plugins-v0.1.5-rc.1.4`

### 新增：Codex 用量插件

- 新增按需插件 `packages/codex-usage`（`dsh-codex-usage-plugin`）：在 Web 输入框下方显示 Codex 的 5 小时与每周额度。收起态即全部信息，没有悬浮面板：
  `Codex · 5h 剩 93% · 2 小时 41 分后刷新 · 周 剩 66% · 4 天 3 小时后刷新`。
- 凭据取自 DSH credentials store 的 `llm-pi-ai/openai-codex`，只读且不刷新；不依赖 codex CLI，也不读取 `~/.codex`。凭据按次惰性解析，避免 Cordis 服务就绪竞态。
- 请求特征（端点 `wham/usage`、请求头、User-Agent、响应字段、脱敏写法）与 DSH pi-ai 及 pi 生态实现对齐；对齐表同时记录在该包 README 与 `src/codex-usage.mjs` 文件头，便于上游更新时同步。
- 安全边界：access token 只出现在发往上游的请求头里；对外错误文本一律脱敏；上游响应中的 `email` / `user_id` / `account_id` 不离开 Host。21 项单元测试覆盖投影、脱敏、凭据解析与客户端契约。
- 该插件不属于默认 Bundle，按需安装：`dsh plugin --profile web add ./packages/codex-usage`。

## 0.1.5-rc.1.3 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `dsh-plugins-v0.1.5-rc.1.3`

### 系统通知

- Windows 原生通知改用 DSH 官方 favicon 生成的多尺寸 `dsh.ico`，替换系统默认信息图标。
- 将 Windows 图标资源纳入插件包发布内容，并补充 PowerShell 路径转义测试。
- macOS 继续使用系统原生通知；`osascript` 接口不支持指定自定义通知图标。

## 0.1.5-rc.1.2 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-rc.1`

**对应本仓库标签：** `dsh-plugins-v0.1.5-rc.1.2`

### 兼容性

- 将插件直接使用的 DSH 依赖、Host peerDependencies 和最低发布年龄放行条目同步到 `0.1.5-rc.1`，并重新生成锁文件。
- 对比官方 `0.1.5-alpha.2` 到 `0.1.5-rc.1` 的相关源码，三个 Host 插件使用的 Service、Event、命令、Web 路由以及 Codex Web classic-script/Slot 契约均未变化，因此无需源码适配。
- RC 的默认模型 ID 从 `deepseek-v4-flash` 切换为 `deepseek-flash`，本仓库未硬编码该模型 ID，无需调整。

### 系统通知

- 完成通知简化为监听 `turn/end` 的 `completed` 结果；审批通知继续监听 `approval/asked`。

## 0.1.5-alpha.2.2 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-alpha.2`

**对应本仓库标签：** `dsh-plugins-v0.1.5-alpha.2.2`

### 依赖与开发体验

- 将 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-agent` 和 `@deepseek-ai/dsh-session` 声明为 system-notification 的 Host `peerDependencies`。
- 将同一组包加入 `devDependencies`，便于本地 IDE、测试和源码导航；运行时仍由 DSH Host 提供，不会复制安装。
- 在 system-notification README 中补充 `Context.on` 的 DSH Cordis 源码链接。

## 0.1.5-alpha.2.1 — 2026-09-10

**对应 DSH 官方标签：** `dsh-v0.1.5-alpha.2`

**对应本仓库标签：** `dsh-plugins-v0.1.5-alpha.2.1`

### Bundle

- 默认 Bundle 只启用 `system-notification`。
- `codex-login` 不再由默认 Bundle 激活，避免首次登录以外的长期依赖。
- 已废弃的 `command-init` 仍不包含在默认 Bundle 中。

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
