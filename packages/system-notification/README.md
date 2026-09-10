# dsh-system-notification-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

为 DSH Host 提供轻量级 macOS / Windows 系统通知。插件只旁路监听事件，不接管或修改 Agent 或审批流程。

## 运行时依赖

本插件通过 DSH Host 传入的 Cordis `Context` 注册事件监听，不在插件内复制 `Context.on` 实现。为明确运行时契约，`package.json` 声明以下 Host 侧 `peerDependencies`，由 DSH Profile 提供：

- `@deepseek-ai/cordis`：提供 `Context.on` / `ctx.on` 事件 API。
- `@deepseek-ai/dsh-session`：提供 `session/event` 事件契约。

具体兼容约束集中维护在本项目的 [`package.json`](./package.json) 中；这些依赖不会被插件重复安装或打包，插件自身没有额外的运行时 npm `dependencies`。`Context.on` 的具体实现可参考 [DeepSeek Harness 源码仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 安装

### 单独安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/system-notification
```

### 使用聚合 Bundle

如果要启用默认的系统通知插件，安装：

```sh
dsh plugin --profile web add ./packs/dsh-plugins
```

安装聚合 Bundle 后，不要再单独安装本插件。

## 监听行为

- 监听 `session/event`：`turn/end` 原因为 `completed` 时通知“任务执行完成”；这是按轮次通知，不额外追踪 Agent 的连续运行或子 Agent。
- 识别持久化事件 `approval/asked`，通知“等待你的确认”；审批事件按 Session 的 `seq` 去重。
- 不监听旧的 `approval/request`，也不向审批链注册 answerer。
- 通知失败只记录 warning，不影响 Agent 循环或已提交的 Session 事件。

## 平台实现

- macOS：调用系统自带的 `osascript`，发送 AppleScript `display notification`；该接口不支持指定自定义通知图标。
- Windows：调用系统自带的 `powershell.exe` 和 .NET `System.Windows.Forms.NotifyIcon` 气泡通知，并使用 `assets/dsh.ico` 作为 DSH 图标，不需要安装第三方 PowerShell 模块或运行时库。
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

1. 在 Web Profile 中触发普通任务，等待 `turn/end` 原因为 `completed`，确认收到“任务执行完成”。
2. 再触发需要审批的操作，确认收到“等待你的确认”。

卸载单独安装的插件：

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
```
