# dsh-plugins

个人维护的 DeepSeek Harness 插件集合。源码使用 pnpm workspace 统一管理，但每个能力仍保持为独立 DSH 插件 / Bundle。

## 目录

| 目录 | 包名 | 用途 |
| --- | --- | --- |
| `packages/init` | `dsh-init-plugin` | 已废弃、兼容保留：Codex 风格 `/init`，用于创建或更新仓库根目录 `AGENTS.md` |
| `packages/codex-login` | `dsh-codex-login-plugin` | 为 DSH Web Profile 提供 ChatGPT / Codex OAuth 登录 |
| `packages/system-notification` | `dsh-system-notification-plugin` | macOS / Windows 原生系统通知 |
| `bundles/dsh-plugins` | `dsh-plugins` | 一次启用上述插件的本地聚合 Bundle |

## 推荐用法：一次安装整套插件

克隆仓库后，在仓库根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

`dsh-plugins` 自己负责插入：

- `authorization`
- `codex-login`
- `system-notification`

因此只需要把 `dsh-plugins` 作为一个 Bundle 加入 Profile，不需要再单独添加其中的插件。已废弃的 `command-init` 不再由统一 Bundle 激活；新项目请使用 `create-agentsmd` skill。

检查最终配置：

```sh
dsh --profile web --dump-config
```

确认配置中存在 `authorization`、`codex-login`、`system-notification`，不再包含已废弃的 `command-init`。

卸载整套插件：

```sh
dsh plugin --profile web remove dsh-plugins
```

> `bundles/dsh-plugins` 当前使用 `workspace:^` 依赖，因此是本地 Monorepo 聚合 Bundle，不用于单独发布到 npm。以后如果各插件发布到 npm，再把依赖切换成正式版本号即可。

## 按需单独安装

如果只需要其中一个能力，不要安装 `dsh-plugins`，直接安装对应插件。

如需兼容旧配置，可单独安装已废弃的 `/init`：

```sh
dsh plugin --profile web add ./packages/init
```

新项目请使用 `create-agentsmd` skill，不再建议启用该插件。

只安装 Codex 登录：

```sh
dsh plugin --profile web add ./packages/codex-login
```

只安装系统通知：

```sh
dsh plugin --profile web add ./packages/system-notification
```

卸载：

```sh
dsh plugin --profile web remove dsh-init-plugin
# 或
dsh plugin --profile web remove dsh-codex-login-plugin
# 或
dsh plugin --profile web remove dsh-system-notification-plugin
```

不要同时安装 `dsh-plugins` 和它所包含的单独插件，否则同一插件可能被多个 Bundle 层重复插入。

## 本地开发

安装 workspace 依赖并检查全部 package：

```sh
pnpm install
pnpm check
```

插件源码仍然彼此独立：

```text
packages/init
packages/codex-login
packages/system-notification
```

`bundles/dsh-plugins` 只负责组合，不承载业务实现。

修改插件后，可先运行：

```sh
pnpm check
```

再通过目标 Profile 的最终配置确认 Bundle 是否正确组合：

```sh
dsh --profile web --dump-config
```

## Bundle 与插件的关系

单独插件各自声明自己的 `dsh.bundle.patch`，所以直接执行 `dsh plugin ... add ./packages/...` 时，它会作为独立 Profile layer 激活。

`dsh-plugins` 则是一个更上层的组合 Bundle。它不依赖 DSH 自动递归激活子 Bundle，而是在自己的 `cordis.patch.yml` 中明确插入需要的插件，从而保证“一次安装整套能力”的语义清晰可预测。

## 历史

迁移前的独立仓库继续保留原提交历史：

- `zz-zhi54/dsh-init-plugin`
- `zz-zhi54/dsh-codex-login-plugin`

Monorepo 从迁移提交开始维护；旧仓库在迁移验证完成前不删除、不归档。
