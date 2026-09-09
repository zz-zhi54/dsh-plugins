# dsh-system-notification-plugin

为 DSH Host 提供轻量级 macOS / Windows 系统通知。插件只旁路监听事件，不接管或修改审批流程。

## 安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/system-notification
```

如果使用本仓库的聚合 Bundle，不要再单独安装本插件：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

## 监听行为

- 监听 `agent/status`，只有同一个 Agent 发生 `running -> idle` 时通知“任务执行完成”。初始 `idle` 不会触发通知。
- 监听 `session/event`，识别持久化事件 `approval/asked`，通知“等待你的确认”。
- 以 Session 的事件 `seq` 去重，因此同一个持久化事件不会重复通知。
- 不监听旧的 `approval/request`，也不向审批链注册 answerer。

## 原生通知实现

- macOS：调用系统自带的 `osascript`，发送 AppleScript `display notification`。
- Windows：调用系统自带的 `powershell.exe` 和 .NET `System.Windows.Forms.NotifyIcon` 气泡通知，不需要安装第三方 PowerShell 模块或运行时库。
- 其他平台不发送通知。

## 验证

检查最终 Profile 是否包含 `system-notification`：

```sh
dsh --profile web --dump-config
```

运行语法检查和单元测试：

```sh
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

手动测试时，在 Web Profile 中触发一个普通任务，等待 Agent 从 `running` 变为 `idle`；再触发一个需要审批的操作，确认分别收到两类系统通知。卸载插件：

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
```
