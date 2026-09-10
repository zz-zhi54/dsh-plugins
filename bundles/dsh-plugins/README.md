# dsh-plugins

本地聚合 Bundle，用于一次启用本仓库当前推荐的 DSH 插件。它只负责组合，不承载业务实现。

## 包含的 Profile 条目

| 条目 ID | package | 用途 |
| --- | --- | --- |
| `authorization` | `@deepseek-ai/dsh-authorization` | ChatGPT / Codex 登录所需的授权服务 |
| `codex-login` | `dsh-codex-login-plugin` | Web 登录入口和 OAuth Host |
| `system-notification` | `dsh-system-notification-plugin` | macOS / Windows 原生系统通知 |

已废弃的 `dsh-init-plugin`（`command-init`）不由此 Bundle 激活，仍可单独安装以兼容旧配置；新项目请使用 `create-agentsmd` skill。

## 安装与卸载

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

卸载：

```sh
dsh plugin --profile web remove dsh-plugins
```

不要同时安装此 Bundle 和上表中的两个独立插件，否则同一组件可能被多个 Profile layer 重复插入。

## 验证

```sh
dsh --profile web --dump-config
```

应看到 `authorization`、`codex-login` 和 `system-notification` 三个条目，且不应看到 `command-init`。

## 工作区说明

此 Bundle 使用 `workspace:^` 依赖指向同一 Monorepo 中的插件，因此是本地工作区聚合 Bundle，目前不用于单独发布到 npm。若未来发布到 npm，应先将内部依赖切换为正式版本号，再单独设计发布流程。
