# dsh-codex

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区组合。

Codex 组合，同时启用 Codex OAuth 登录入口和 5 小时 / 每周额度显示；Session 费用插件不属于此组合，需要单独安装。

## 包含的 Profile 条目

| 条目 ID | package | 用途 |
| --- | --- | --- |
| `authorization` | `@deepseek-ai/dsh-authorization` | DSH 授权服务 |
| `codex-login` | [`dsh-codex-login-plugin`](../../packages/codex-login/README.md) | ChatGPT / Codex OAuth 登录入口 |
| `codex-usage` | [`dsh-codex-usage-plugin`](../../packages/codex-usage/README.md) | Codex 额度和重置倒计时 |

## 安装与卸载

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packs/codex
```

卸载：

```sh
dsh plugin --profile web remove dsh-codex
```

该组合已经显式插入 `authorization`、`codex-login` 和 `codex-usage`；不要在组合仍保留期间再单独安装这两个 Codex 子插件，否则可能重复插入相同 Profile 条目。

## 首次登录后的处理

启动 Web 后，在模型设置页底部打开 ChatGPT / Codex 登录入口，按提示完成 OAuth 授权。登录成功后凭据已保存到 DSH credentials store。

如果只需要继续查看额度，可以卸载此组合，改为单独安装 `dsh-codex-usage-plugin`；登录插件仅用于首次登录。

## 验证

查看 Profile：

```sh
dsh --profile web --dump-config
```

安装期间应看到 `authorization`、`codex-login` 和 `codex-usage`。

语法检查和测试：

```sh
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-codex-usage-plugin run check
pnpm --filter dsh-codex-usage-plugin run test
```

OAuth 和真实额度需要本机授权与凭据，静态检查不能替代完整运行时验证。
