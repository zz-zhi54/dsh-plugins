# dsh-plugins

DeepSeek Harness（DSH）插件集合，以 pnpm workspace monorepo 组织。可独立安装的插件位于 `packages/*`，用于组合插件的 Bundle 位于 `bundles/*`。

> 这是非官方社区项目，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。
>
> 本 README 是用户入口，负责项目选择、安装方式和仓库结构；各项目 README 负责记录自身的具体行为和限制。版本号、DSH 兼容关系及发布记录请以 [`CHANGELOG.md`](CHANGELOG.md) 和各项目的 `package.json` 为准，本文不固定具体版本号。

## 项目总览

| 项目 | 类型 | 包名 | 用途 | 详细说明 |
| --- | --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | 插件；默认 Bundle 成员 | `dsh-system-notification-plugin` | 旁路监听任务状态和审批事件，发送 macOS / Windows 原生系统通知 | [`README`](packages/system-notification/README.md) |
| [`packages/codex-login`](packages/codex-login/) | 按需临时插件 | `dsh-codex-login-plugin` | 提供 ChatGPT / Codex OAuth 登录入口；首次登录完成后即可卸载 | [`README`](packages/codex-login/README.md) |
| [`packages/init`](packages/init/) | 兼容插件（已废弃） | `dsh-init-plugin` | 提供旧项目使用的 Codex 风格 `/init` 命令；新项目使用 `create-agentsmd` skill | [`README`](packages/init/README.md) |
| [`bundles/dsh-plugins`](bundles/dsh-plugins/) | 聚合 Bundle | `dsh-plugins` | 默认组合系统通知插件，不承载业务实现 | [`README`](bundles/dsh-plugins/README.md) |

### 项目关系

- `dsh-plugins` Bundle 只显式启用 `system-notification`，不包含 Codex 登录和已废弃的 `/init`。
- Codex 登录插件只在首次 OAuth 登录时按需安装；凭据保存到 DSH credentials store 后可以卸载。
- `dsh-init-plugin` 仅用于旧配置或旧工作流兼容，新项目请使用 `create-agentsmd` skill。
- `dsh-plugins` 和 `dsh-system-notification-plugin` 二选一，不要同时安装，以免重复插入同一 Profile 条目。

## 安装

当前安装入口使用仓库路径；命令均从仓库根目录执行。先获取源码并进入目录：

```sh
git clone https://github.com/zz-zhi54/dsh-plugins.git
cd dsh-plugins
```

### 默认启用系统通知

安装聚合 Bundle：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

检查 Profile：

```sh
dsh --profile web --dump-config
```

在没有额外插件的情况下，应出现 `system-notification`，不应出现 `authorization`、`codex-login` 或 `command-init`。

卸载 Bundle：

```sh
dsh plugin --profile web remove dsh-plugins
```

### 按需安装单个项目

需要某项能力时，直接进入对应项目 README，按其中的安装、卸载和验证步骤操作：

- [Codex 登录插件](packages/codex-login/README.md)
- [系统通知插件](packages/system-notification/README.md)
- [旧项目 `/init` 兼容插件](packages/init/README.md)

## 开发

依赖安装和检查都从仓库根目录执行，并使用 pnpm：

```sh
pnpm install
pnpm check
```

只检查单个项目：

```sh
pnpm --filter dsh-init-plugin run check
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

根工作区没有统一的 `build`、`test`、lint 或 format 脚本；依赖解析记录统一维护在根目录 `pnpm-lock.yaml`。不要在子项目中使用 npm/yarn 单独安装依赖。

## 仓库结构与文档分工

- `packages/*/src`：各插件的运行时代码。
- `packages/*/cordis.patch.yml`：对应插件要插入的 Profile 条目。
- `bundles/dsh-plugins/cordis.patch.yml`：默认 Bundle 的显式组合关系。
- [`CHANGELOG.md`](CHANGELOG.md)：版本、兼容关系和发布记录。
- `AGENTS.md`：面向编码 Agent 的项目约束，不是用户使用手册。
- `dsh/`：部署到用户全局 `~/.dsh/` 的 DSH 源文件，不属于 pnpm workspace，也不参与插件 Bundle。

插件通过自身 `package.json` 的 `dsh.bundle.patch` 指向 patch 文件；patch 只描述组件 ID 和 package 名称，业务实现留在对应项目中。DSH 不会因为 Bundle 依赖而自动递归激活子 Bundle。

## 迁移背景

迁移到本 monorepo 前的独立仓库保留原提交历史：

- `zz-zhi54/dsh-init-plugin`
- `zz-zhi54/dsh-codex-login-plugin`
