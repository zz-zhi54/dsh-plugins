# Changelog

本文件记录 `dsh-plugins` 的插件版本，以及每个版本对应的 DeepSeek Harness 官方版本。

版本格式为 `DSH 版本.插件修订号`：

- `0.1.5-alpha.2.1`：基于 DSH `0.1.5-alpha.2` 的第一个插件修订版。
- 同一 DSH 版本下继续修复或改进插件时，递增最后的插件修订号。
- 切换到新的 DSH 版本时，更新 DSH 版本部分，并将插件修订号从 `.1` 重新开始。

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
