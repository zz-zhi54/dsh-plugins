# dsh-codex-login-plugin

为 DeepSeek Harness Web Profile 添加 ChatGPT / Codex OAuth 登录入口。

## 安装

### 单独安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/codex-login
```

该 package 自己的 patch 会插入以下两个 Profile 条目：

- `authorization`：DSH 授权服务。
- `codex-login`：本插件的 OAuth Host 和 Web 客户端。

### 使用聚合 Bundle

如果要启用本仓库的全部推荐插件，安装：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

此时不要再单独安装 `dsh-codex-login-plugin`，避免重复插入同一组件。

## 使用方式

启动 Web 后，在模型设置页底部打开 ChatGPT / Codex 登录入口，按提示完成 OAuth 授权。登录流程支持授权提示、交互回答和取消。

OAuth 需要真实的外部授权；仅运行语法检查不能验证完整登录流程。

## 验证

查看最终 Profile：

```sh
dsh --profile web --dump-config
```

单独安装时应看到 `authorization` 和 `codex-login`；使用聚合 Bundle 时还应看到 `system-notification`。

语法检查：

```sh
pnpm --filter dsh-codex-login-plugin run check
```

## 实现约束

- `src/host.mjs` 依赖 DSH 的 `authorization` 和 `webServer`，并注册 `/api/codex-login/start`、`poll`、`answer`、`cancel` 接口。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，不是普通 ESM；修改时必须保留 `window.__ModuleLoader__.load({ id, factory })` 和 `require('react')` 的结构。
