# dsh-codex-login-plugin

为 DeepSeek Harness Web Profile 添加 ChatGPT / Codex OAuth 登录。

## 安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/codex-login
```

如果希望同时启用本仓库的全部个人插件，使用根目录文档中的 `bundles/personal`，不要再重复单独安装本插件。

该 Bundle 会插入 `@deepseek-ai/dsh-authorization` 和 `dsh-codex-login-plugin`。

## 验证

```sh
dsh --profile web --dump-config
```

应能看到 `authorization` 和 `codex-login`。

启动 Web 后，在模型设置页底部应出现 ChatGPT / Codex 登录入口。
