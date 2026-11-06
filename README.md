<!-- deepseek-harness-meta
{
  "name": "dsh-plugins",
  "version": "0.2.2-rc.1.2",
  "tags": ["deepseek", "deepseek-harness", "dsh", "plugins"],
  "description": "非官方 DeepSeek Harness 系统通知插件，支持 macOS / Windows",
  "icon": "https://raw.githubusercontent.com/zz-zhi54/dsh-plugins/v0.2.2-rc.1.2/packages/system-notification/assets/dsh.ico",
  "install_method": "dsh plugin --profile desktop add 'github:zz-zhi54/dsh-plugins#main&path:packages/system-notification'"
}
-->

# dsh-plugins

[English](README.en.md)

个人维护的 DeepSeek Harness（DSH）插件仓库，以 pnpm workspace 组织。目前只维护系统通知插件。

> 这是个人维护的非官方社区项目，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。
>
> 本 README 负责安装方式和仓库结构；插件 README 记录具体行为和限制。实际版本、DSH 兼容关系及发布记录请以 [`CHANGELOG.md`](CHANGELOG.md) 和插件的 [`package.json`](packages/system-notification/package.json) 为准。

## 项目总览

当前已验证的开发基线为 **DeepSeek Harness 官方已发布的 DSH `v0.2.2-rc.1`**。这只是开发验证环境记录，不是安装版本限制。通知插件通过 Host 提供的 API 工作，不声明 `engines.dsh` 或 Host peer 版本约束；DSH 仅更新版本号时无需修改插件，实际事件契约变化时再做兼容适配。历史 tag 保留各自原有的版本声明。

| 插件 | 包名 | 用途 | 详细说明 |
| --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | `dsh-system-notification-plugin` | 旁路监听任务状态和审批事件，发送 macOS / Windows 原生系统通知 | [`README`](packages/system-notification/README.md) |

我目前已使用 Magpie，它能够满足我原先使用 Codex 登录、Codex 额度和 Session 费用插件的需求，因此停止维护并移除这三个插件，只保留系统通知。历史实现保留在 Git 历史和旧版本 tag 中。

## 设计原则

- **最小依赖、最少代码**：只引入完成目标所需的依赖，优先复用 DSH 已提供的服务和扩展点。
- **轻量、稳定**：围绕实际使用场景提供小而明确的能力，优先控制维护成本。
- **最小侵入**：插件以独立 Profile layer 接入，不修改 DSH 核心，不接管 Agent 循环或审批流程。
- **开放协作**：欢迎通过 Issue 和 Pull Request 提交问题、建议、文档、测试或实现。
- **稳定优先**：保持现有行为和公开契约；通知失败时，不应影响 DSH 主流程。
- **上游优先、可撤销**：当 DSH 官方提供等价能力时，对应插件会停止维护并删除。

## 参与贡献

欢迎提交 Issue 或 Pull Request。贡献应保持功能边界清晰，优先使用 DSH 公开服务和扩展点，同步必要的测试和文档，并说明验证方式。

## 安装、卸载与更新

无需 clone 仓库或预装其他插件。桌面端安装、更新或卸载时，将命令中的 `--profile web` 改为 `--profile desktop`。

### 安装和更新

直接跟随 `main` 安装系统通知插件：

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#main&path:packages/system-notification'
```

需要获取 `main` 的后续更新时，重新执行上述 `add` 命令或通过插件管理器更新；分支安装不会实时同步代码到正在运行的 DSH。

需要固定到已发布的 `v0.2.2-rc.1.2` 时，使用：

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.2.2-rc.1.2&path:packages/system-notification'
```

该版本已移除 Host 版本限制；历史 tag 保留原有的兼容约束。

安装后检查 Profile：

```sh
dsh --profile web --dump-config
```

### 卸载

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
```

如果安装过已移除的旧插件，可按实际安装情况执行：

```sh
dsh plugin --profile web remove dsh-codex-login-plugin
dsh plugin --profile web remove dsh-codex-usage-plugin
dsh plugin --profile web remove dsh-session-cost-plugin
```

系统通知的行为、平台限制和手动验证步骤见[插件 README](packages/system-notification/README.md)。

## 开发

依赖安装和检查都从仓库根目录执行，并使用 pnpm：

```sh
pnpm install
pnpm check
pnpm -r --if-present run test
git diff --check
```

单独检查系统通知插件：

```sh
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

依赖解析统一维护在根目录 [`pnpm-lock.yaml`](pnpm-lock.yaml)，保留 pnpm 默认的 peer 自动安装行为。不要在子项目中使用 npm/yarn 单独安装依赖。

## 仓库结构与文档分工

- [`packages/system-notification`](packages/system-notification/)：通知插件的运行时代码、Profile patch、图标、测试和说明。
- [`CHANGELOG.md`](CHANGELOG.md)：版本、兼容关系和发布记录。
- [`docs/compatibility`](docs/compatibility/)：各次上游兼容审计记录。
- [`AGENTS.md`](AGENTS.md)：面向编码 Agent 的项目约束。
- `dsh/`：部署到用户全局 `~/.dsh/` 的 DSH 源文件，不属于 pnpm workspace。

插件通过自身 [`package.json`](packages/system-notification/package.json) 的 `dsh.bundle.patch` 指向 patch 文件；patch 只描述组件 ID 和 package 名称，业务实现留在插件内，不需要组合层或递归依赖。

## 许可证

本项目代码采用 [Apache License 2.0](LICENSE)。第三方依赖及 DeepSeek Harness 本身仍以各自的许可证和条款为准。
