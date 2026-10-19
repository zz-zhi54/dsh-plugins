# DSH `0.2.1-rc.2` 兼容同步

## 基线与范围

- 上游正式标签：[DSH `dsh-v0.2.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2)。
- 上一个插件版本：`0.2.0-rc.2.2`；本次准备：`0.2.1-rc.2.1`。
- **以官方已发布的 RC 为兼容同步依据，不再等待 Desktop。**
- 四个插件分别保持原有功能，不增加新功能或重构现有逻辑。

## 实际改动

| 插件 | 依赖/兼容同步 | 运行时代码 |
| --- | --- | --- |
| `session-cost` | `dsh-session` 和 `dsh-session-projection` 升到 `0.2.1-rc.2`；`pi-ai` `0.87.1 → 1.1.0` | 保持原有 durable event 投影及费用计算 |
| `codex-usage` | 声明 `engines.dsh = 0.2.1-rc.2`；核对相应 pi-ai Codex 请求头约定 | 凭据、HTTP 查询、脱敏与 UI 均保持不变 |
| `codex-login` | `dsh-authorization` 升到 `0.2.1-rc.2` | 仍调用宿主 Authorization，保持 OAuth 流程 |
| `system-notification` | `dsh-session` 升到 `0.2.1-rc.2`，`cordis` 升到 `4.0.5` | 继续旁路监听 `session/event` |

- 四个插件统一版本 `0.2.1-rc.2.1`，均增加 `engines.dsh = 0.2.1-rc.2`，让新版安装器明确校验目标 runtime。
- 根据上游真实 workspace manifest 分别确认 DSH `0.2.1-rc.2`、Cordis `4.0.5`、Cosmokit `1.8.6`、Schemastery `3.18.5`，不机械统一整个 `@deepseek-ai/*` 版本。
- `pnpm-lock.yaml` 由 pnpm 实际解析生成，清除了旧版 transitive `dsh-invariants` 引用。
- 上游内置 `conversation.composer.dock` 的统计由 `stats` 拆分为 `activity`（order 0）和 `usage`（order 1）；插件的 `session-cost`（order 10）与 `codex-usage`（order 20）维持原有独立注册。
- 检查了 [pi-ai `v1.1.0` 的 Codex provider](https://github.com/earendil-works/pi/blob/v1.1.0/packages/ai/src/api/openai-codex-responses.ts)，其中仍使用 `Authorization`、`chatgpt-account-id`、`originator: pi` 与 `getPiUserAgent()`；用量 GET 不复制 SSE 专用头。
- 更新根 `AGENTS.md`、兼容和发布 Skill、中英文 README、局部插件契约文档以及 `CHANGELOG.md`。

## 验证及限制

- 通过 GitHub 执行 pnpm 依赖重新解析；锁文件已经提交到当前兼容分支。
- 生成锁文件的临时验证工作流顺序执行 `pnpm install --no-frozen-lockfile`、`pnpm check`、`pnpm -r --if-present run test`、`git diff --check`，成功后才提交锁文件。
- 尚未在真实运行的 DSH `0.2.1-rc.2` 上完成四个插件的安装、刷新、卸载与 UI 冒烟测试；不要声称运行时完全兼容。
- 本次任务没有创建 tag 或 GitHub Release；发布需另行明确授权。
