# DSH `0.2.1-rc.2` 上游兼容性预审计

> 状态：**预审计，尚未切换 Desktop 兼容/发布基线**。
> 本文仅记录公开上游 RC 的变更及本仓库已核对的依赖面；不能代替实际 Desktop 安装和测试结果。

## 依据

- 本仓库现有基线：Desktop 内置 DSH `0.2.0-rc.2`；插件 `0.2.0-rc.2.2`。
- 上游 [`dsh-v0.2.1-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.1) 汇总了 `0.2.0-rc.2` 以来的变化。
- 上游 [`dsh-v0.2.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2) 增加新模型及搜索/抓取支持；其源码 `apps/desktop/package.json` 的版本为 `0.2.1-rc.2`。**源码声明版本不等于已经确认官方 Desktop 更新源分发该版本，更不等于用户实际安装。**
- 遵循 [兼容 Skill](../../.agents/skills/dsh-upstream-compatibility/SKILL.md)：不能仅凭上游 tag 升级插件依赖；发布与版本标签另由 [发布 Skill](../../.agents/skills/release-version/SKILL.md) 管理。

## 四个插件的影响面

| 插件 | 新 RC 初步发现 | 切换版本前仍需验证 |
| --- | --- | --- |
| `session-cost` | 上游继续提供 `sessionProjections.register` 和 `stateOf`；`tokenUsage` 投影仍存在；新的 composer 统计行分为 `activity`（order 0）和 `usage`（order 1），插件自己的 `session-cost`（order 10）不会覆盖它们 | 逐项对比 `request/header`、`assistant/message`、`assistant/attempt` 的字段和计费口径、Session `seq`、Web 路由；确认与当前 Host 的真实费用 |
| `codex-usage` | `conversation.composer.dock` 仍存在；独立 `codex-usage`（order 20）无需改为上游 `activity` / `usage` ID | 读取对应 Desktop 版本的 Codex provider 和 pi 生态额度客户端，核对请求头、`wham/usage`、凭据结构、脱敏与主动刷新/热重载 |
| `codex-login` | 上游仍使用 `authorization.begin({ key, method, interaction })` 形式 | 核对 `describe/begin/cancel`、交互回调、`settings.models.footer`、授权持久化及路由释放 |
| `system-notification` | 上游仍有 `session/event` durable 事件接入 | 核对 `turn/end` completed、`approval/asked` 的 payload、`seq` 去重和监听器热卸载 |

另有新版本的 **破坏性变化**：上游移除 runtime invariant 插件及 `./invariant` 导出。当前 `pnpm-lock.yaml` 解析树仍含旧的 `@deepseek-ai/dsh-invariants@0.2.0-rc.2`，因此 **绝不能靠全局字符串替换来升级锁文件**。必须以当前新包真实 peer 依赖重新安装并生成 lockfile。

## 本次 PR 的修改边界

- 仅新增本次审计记录；**不改变**四个插件的代码、peer/devDependencies、`pnpm-lock.yaml`、README 发布版本或 tag。
- 新的 `activity` / `usage` 是上游内置统计注册 ID，而本仓库只追加自己的统计项；不能把独立 ID 误改成内置 ID。
- 不将新 RC 的公开发布误报为 Desktop 已安装，不将源码查阅误报为端到端兼容通过。

## 进入实际升级的条件

1. 在官方 Desktop 上确认当前内置 runtime 已升级到 `0.2.1-rc.2`，记录版本与对应 commit；如果仍是 `0.2.0-rc.2`，维持当前发布基线。
2. 从新 Desktop 对应上游版本确定 **每个**实际使用的 DSH/Cordis 包版本，不机械统一所有包版本。
3. 重新运行 `pnpm install`，生成真实 `pnpm-lock.yaml`，并核对不再解析已移除的 invariant 插件；运行 `pnpm check`、`pnpm -r --if-present run test`、`git diff --check`。
4. 在真实 Desktop 上逐个安装、重载和卸载四个插件，验证费用、额度、登录与系统通知的行为及安全边界。
5. 仅在以上条件完成后按 Skill 准备首次兼容版本 `0.2.1-rc.2.1` 及对应 PR；未经这些验证，不创建发布 tag。

## 验证状态

- 已通过 GitHub 仓库内容与上游源码/文档做静态查阅。
- **未通过**本机 Desktop 版本确认、依赖安装、自动测试或实际 UI 冒烟测试；本次不声明这些检查已通过。
