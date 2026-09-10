# dsh-system-notification-plugin

> 非官方社区插件，当前按 DeepSeek Harness `0.1.5-alpha.2` 验证。

为 DSH Host 提供轻量级 macOS / Windows 系统通知。插件只旁路监听事件，不接管或修改 Agent 或审批流程。

## 安装

### 单独安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/system-notification
```

### 使用聚合 Bundle

如果要启用默认的系统通知插件，安装：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

安装聚合 Bundle 后，不要再单独安装本插件。

## 监听行为

- 监听 `agent/status`：只有同一个 Agent 发生 `running -> idle` 时才通知“任务执行完成”，初始 `idle` 不会触发通知。
- 监听 `session/event`：识别持久化事件 `approval/asked`，通知“等待你的确认”。
- 监听器注册在 Profile 根上下文，因此 DSH 的 in-process Subagent / Agent Teams 子 Agent 也会被观察；子 Agent 的 `running -> idle` 会额外触发完成通知，当前未做过滤或聚合。
- `agent/status` 不携带结束原因；失败、中断或 teardown 后回到 `idle` 时，当前也会使用“任务执行完成”文案。这是当前策略限制，不是 alpha2 API 断裂。
- 以 Session 事件的 `seq` 去重，同一个持久化事件不会重复通知。
- 不监听旧的 `approval/request`，也不向审批链注册 answerer。
- 通知失败只记录 warning，不影响 Agent 循环或已提交的 Session 事件。

## 平台实现

- macOS：调用系统自带的 `osascript`，发送 AppleScript `display notification`。
- Windows：调用系统自带的 `powershell.exe` 和 .NET `System.Windows.Forms.NotifyIcon` 气泡通知，不需要安装第三方 PowerShell 模块或运行时库。
- 其他平台：插件仍可加载，但不发送通知。

## 验证

检查最终 Profile：

```sh
dsh --profile web --dump-config
```

运行语法检查和单元测试：

```sh
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

手动测试：

1. 在 Web Profile 中触发普通任务，等待 Agent 从 `running` 变为 `idle`，确认收到“任务执行完成”。
2. 再触发需要审批的操作，确认收到“等待你的确认”。

卸载单独安装的插件：

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
```
