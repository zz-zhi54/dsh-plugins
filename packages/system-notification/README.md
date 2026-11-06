# dsh-system-notification-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

为 DSH Host 提供轻量级 macOS / Windows 系统通知。插件只旁路监听事件，不接管或修改 Agent 或审批流程。

已验证的运行时基线为 DSH `0.2.2-rc.1`（该版 DSH 要求 Node.js `>=24.9.0`），对应 Cordis `4.1.0`。验证基线仅记录开发和测试环境，不限制安装到其他 DSH 版本。

## 运行时依赖

本插件通过 DSH Host 传入的 Cordis `Context` 注册事件监听，只依赖 `ctx.on('session/event', listener)`、任务完成及审批事件、稳定的事件 `seq` 和 Host logger。

插件不直接导入 Cordis 或 DSH npm 包，没有生产 `dependencies`、Host `peerDependencies` 或 `engines.dsh` 限制。后续 DSH 版本保留这些 API 和事件语义时，无需仅为更新版本号修改插件。

[`package.json`](./package.json) 中的固定 `devDependencies` 仅用于开发验证，不限制 Host 版本。实际事件契约发生变化时，再进行必要的兼容适配。

## 安装

从 GitHub 的 `main` 安装：

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#main&path:packages/system-notification'
```

需要获取 `main` 的后续更新时，重新执行上述 `add` 命令或通过插件管理器更新；分支安装不会实时同步代码。

需要固定到本次发布版本时，使用 `#v0.2.2-rc.1.2&path:packages/system-notification`。桌面 Profile 将 `--profile web` 改为 `--profile desktop`。

## 监听行为

- 监听 `session/event`：`turn/end` 原因为 `completed` 时通知“任务执行完成”；这是按轮次通知，不额外追踪 Agent 的连续运行或子 Agent。
- 识别持久化事件 `approval/asked`，通知“等待你的确认”；审批事件按 Session 的 `seq` 去重。
- 不监听旧的 `approval/request`，也不向审批链注册 answerer。
- 通知失败只记录 warning，不影响 Agent 循环或已提交的 Session 事件。
- `session/event` 表示事件已提交到 Session 日志，不保证通知时已经完成磁盘 flush。

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
