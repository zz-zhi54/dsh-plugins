# dsh-default

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区组合，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。

本地默认组合，用于启用本仓库的系统通知和 Session 费用插件。它只负责组合，不承载业务实现。

## 包含的 Profile 条目

| 条目 ID | package | 用途 |
| --- | --- | --- |
| `system-notification` | [`dsh-system-notification-plugin`](../../packages/system-notification/README.md) | macOS / Windows 原生系统通知 |
| `session-cost` | [`dsh-session-cost-plugin`](../../packages/session-cost/README.md) | 在 Token 统计行显示 Session USD 费用 |

此组合不激活 Codex 登录和用量插件，需要时请安装 [`dsh-codex`](../codex/README.md)。

## 安装与卸载

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packs/default
```

卸载：

```sh
dsh plugin --profile web remove dsh-default
```

不要同时安装此组合和 `dsh-system-notification-plugin` 或 `dsh-session-cost-plugin`，否则同一组件可能被多个 Profile layer 重复插入。

## 验证

```sh
dsh --profile web --dump-config
```

在没有另外安装插件的情况下，应看到 `system-notification` 和 `session-cost`，且不应看到 `authorization`、`codex-login` 或 `codex-usage`。

## 工作区关系

此组合使用 `workspace:^` 依赖指向同一 Monorepo 中的系统通知和 Session 费用插件，因此只负责组合，不承载业务实现。统一安装入口和与其他项目的关系见[根目录 README](../../README.md)。
