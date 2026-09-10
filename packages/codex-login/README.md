# dsh-codex-login-plugin

> 非官方社区插件，当前按 DeepSeek Harness `0.1.5-alpha.2` 验证。
>
> **临时按需插件。** 仅用于首次完成 ChatGPT / Codex OAuth 登录；登录成功后即可卸载。等待 DSH 官方提供 Codex 登录入口后，本插件将不再需要。

为 DeepSeek Harness Web Profile 添加 ChatGPT / Codex OAuth 登录入口，目标凭据为 `llm-pi-ai/openai-codex`。当前实现使用 DSH 官方的 `authorization` 服务，并将成功取得的凭据提交到 DSH credentials store；本插件本身只提供登录流程和 Web 交互界面，不是新的 Codex Provider，也不是完整的 OpenAI Codex 实现。

## 按需安装

Codex 登录插件不属于默认的 `dsh-plugins` Bundle。需要首次登录时，在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/codex-login
```

该 package 自己的 patch 会插入以下两个 Profile 条目：

- `authorization`：DSH 授权服务。
- `codex-login`：本插件的 OAuth Host 和 Web 客户端。

## 首次登录后的处理

启动 Web 后，在模型设置页底部打开 ChatGPT / Codex 登录入口，按提示完成 OAuth 授权。授权成功后凭据已持久化到 DSH credentials store，不再需要保留本插件，可以立即卸载：

```sh
dsh plugin --profile web remove dsh-codex-login-plugin
```

如果未来 DSH 官方提供等价的 Codex 登录入口，应迁移到官方实现并删除本临时插件。

## 验证

查看 Profile：

```sh
dsh --profile web --dump-config
```

首次登录期间应看到 `authorization` 和 `codex-login`。完成登录并卸载后，这两个条目也应从 Profile 中消失，但已保存的凭据仍由 DSH credentials store 管理。

语法检查：

```sh
pnpm --filter dsh-codex-login-plugin run check
```

OAuth 需要真实的外部授权；仅运行语法检查不能验证完整登录流程。

## 实现约束

- `src/host.mjs` 依赖 DSH 的 `authorization` 和 `webServer`，并注册 `/api/codex-login/start`、`poll`、`answer`、`cancel` 接口。
- `src/client.js` 是 DSH Web 使用的 classic-script 模块，不是普通 ESM；修改时必须保留 `window.__ModuleLoader__.load({ id, factory })` 和 `require('react')` 的结构。
