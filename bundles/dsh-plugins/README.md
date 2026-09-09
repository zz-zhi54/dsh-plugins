# dsh-plugins

本地聚合 Bundle，用于一次启用本仓库维护的 DSH 插件。

当前包含：

- `dsh-codex-login-plugin`
- `dsh-system-notification-plugin`
- `@deepseek-ai/dsh-authorization`（Codex 登录所需 Service）

已废弃的 `dsh-init-plugin` 不再由此 Bundle 激活，但仍保留为可单独安装的兼容插件。新项目请使用 `create-agentsmd` skill。

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

安装后可检查最终配置：

```sh
dsh --profile web --dump-config
```

应能看到 `authorization`、`codex-login` 和 `system-notification` 三个条目。

卸载：

```sh
dsh plugin --profile web remove dsh-plugins
```

此 Bundle 使用 `workspace:^` 依赖指向同一 Monorepo 中的插件，因此定位为本地工作区聚合 Bundle，不用于单独发布到 npm。若未来将各插件发布到 npm，应把这些依赖改为正式版本号后再发布聚合 Bundle。

不要同时通过 `dsh-plugins` Bundle 和单独插件方式重复启用同一插件，否则会产生重复配置层。
