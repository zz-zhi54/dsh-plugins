# AGENTS.md

## 范围

本文件适用于 `packages/system-notification`。根目录 `AGENTS.md` 的全局规则同时生效。

该插件是纯旁路观察器：监听 DSH 已持久化的 Session 事件，在任务完成或需要审批时发送 macOS / Windows 原生通知；不得接管 Agent 循环、审批流程或 answerer。

## DSH 依赖面

### Packages

- `@deepseek-ai/dsh-session`
- `@deepseek-ai/cordis`

以上包仅作为固定版本的 `devDependencies` 提供开发验证环境；运行时代码不直接导入它们。不得仅为跟随 DSH 版本添加 `engines.dsh` 或 Host `peerDependencies` 限制。兼容性取决于下列 API 和事件契约，只有契约实际变化时才做适配。

### Cordis / Session event API

- `ctx.on('session/event', listener)`
- listener 签名依赖 `(session, event)`
- DSH `0.2.2-rc.1` 在 Session log 提交后调用监听器；这不代表已经完成磁盘 flush。
- 监听器依赖插件生命周期自动清理，不自行接管总线生命周期；Cordis `4.1.0` 仍由所属 fiber 持有并释放监听器。

### Durable event contract

任务完成通知依赖：

- `event.type === 'turn/end'`
- `event.data.reason.kind === 'completed'`

审批通知依赖：

- `event.type === 'approval/asked'`
- `event.seq` 作为同一 Session 中持久事件的稳定位置，用于去重。

如果上游把这些事件从 durable Session event 改成瞬态 Agent event、修改字段语义、改变提交时机或取消 `seq` 稳定性，必须重新设计判断；不能只改字段名让测试通过。

## 行为契约

- 只观察已经提交的 `session/event`，不监听/拦截审批服务来制造通知。
- 只在 `turn/end` 的 `completed` 结果通知任务完成；取消、失败或其它结束原因不能误报完成。
- `approval/asked` 必须按 Session + event seq 去重，避免同一持久事件重复通知。
- 原生通知失败只能记录 warning，绝不能反向影响 Agent、Session append 或审批流程。
- WeakMap/Set 去重只用于进程内旁路状态，不变成持久化事实源。
- macOS / Windows 命令参数必须继续做转义，平台通知实现变化不能降低现有安全边界。

## DSH 升级重点

上游出现以下变化时优先检查本插件：

- Cordis `ctx.on` 生命周期或事件签名；
- `session/event` 的 durable/dispatch 语义；
- `turn/end` reason；
- `approval/asked`；
- Session event `seq`；
- Plugin Manager 加载、卸载或 HMR 生命周期。
