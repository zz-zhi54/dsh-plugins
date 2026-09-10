# dsh-plugins

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区 Bundle，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。

本地默认 Bundle，用于启用本仓库的系统通知插件。它只负责组合，不承载业务实现。

## 包含的 Profile 条目

| 条目 ID | package | 用途 |
| --- | --- | --- |
| `system-notification` | [`dsh-system-notification-plugin`](../../packages/system-notification/README.md) | macOS / Windows 原生系统通知 |

临时的 `dsh-codex-login-plugin`（`authorization`、`codex-login`）不由此 Bundle 激活。

Codex 登录只在需要首次登录时单独加载：完成 OAuth 后凭据已保存到 DSH credentials store，可以卸载插件。等待 DSH 官方提供 Codex 登录后，该临时插件即可淘汰。详见 [`dsh-codex-login-plugin` README](../../packages/codex-login/README.md)。

## 安装与卸载

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

卸载：

```sh
dsh plugin --profile web remove dsh-plugins
```

不要同时安装此 Bundle 和 `dsh-system-notification-plugin`，否则同一组件可能被多个 Profile layer 重复插入。Codex 登录插件不在此 Bundle 中，可以按需临时安装。

## 验证

```sh
dsh --profile web --dump-config
```

在没有另外安装插件的情况下，应看到 `system-notification`，且不应看到 `authorization` 或 `codex-login`。

## 工作区关系

此 Bundle 使用 `workspace:^` 依赖指向同一 Monorepo 中的系统通知插件，因此只负责组合，不承载业务实现。统一安装入口和与其他项目的关系见[根目录 README](../../README.md)。
