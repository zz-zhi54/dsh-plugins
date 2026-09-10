# dsh-plugins

DeepSeek Harness（DSH）插件的 pnpm workspace monorepo。插件实现分别位于 `packages/*`，`bundles/dsh-plugins` 只负责提供默认的系统通知 Bundle。

> 这是非官方社区项目，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。
>
> 当前插件版本为 `0.1.5-alpha.2.1`，按 DeepSeek Harness `0.1.5-alpha.2` 验证。插件和 Bundle 仍是私有 workspace 包，尚未发布到 npm；请从源码仓库路径安装。

## 文档分工

- 根目录 `README.md`：安装方式、组件总览和开发命令。
- [`packages/codex-login/README.md`](packages/codex-login/README.md)：临时 Codex 登录插件的行为和限制。
- [`packages/system-notification/README.md`](packages/system-notification/README.md)：系统通知插件的行为、平台和验证方式。
- [`packages/init/README.md`](packages/init/README.md)：已废弃 `/init` 兼容插件说明。
- [`bundles/dsh-plugins/README.md`](bundles/dsh-plugins/README.md)：默认 Bundle 说明。
- [`CHANGELOG.md`](CHANGELOG.md)：按插件版本记录变更，并标注对应的 DSH 官方标签。
- `AGENTS.md`：面向编码 Agent 的约束，不作为用户使用手册。
- `dsh/`：DSH 全局目录的源文件，部署到用户全局的 `~/.dsh/`；不属于 pnpm workspace，也不参与插件 Bundle。

## 组件

| 类型 | 路径 | 包名 | 插入的 Profile 条目 | 说明 |
| --- | --- | --- | --- | --- |
| 按需插件 | `packages/codex-login` | `dsh-codex-login-plugin` | `authorization`、`codex-login` | 临时提供 ChatGPT / Codex OAuth 登录；首次登录完成后即可卸载 |
| 默认插件 | `packages/system-notification` | `dsh-system-notification-plugin` | `system-notification` | 发送 macOS / Windows 原生任务和审批通知 |
| 兼容插件 | `packages/init` | `dsh-init-plugin` | `command-init` | 已废弃的 `/init`，仅为旧配置保留；新项目使用 `create-agentsmd` skill |
| 聚合 Bundle | `bundles/dsh-plugins` | `dsh-plugins` | `system-notification` | 默认只启用系统通知，不包含 Codex 登录 |

## 安装

当前只支持从源码仓库本地安装，不提供 npm 安装方式。先克隆仓库并进入根目录：

```sh
git clone https://github.com/zz-zhi54/dsh-plugins.git
cd dsh-plugins
```

### 安装默认 Bundle

在仓库根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

在没有另外安装其他插件的情况下，最终 Profile 应出现 `system-notification`，不应出现 `authorization`、`codex-login` 或已废弃的 `command-init`：

```sh
dsh --profile web --dump-config
```

卸载默认 Bundle：

```sh
dsh plugin --profile web remove dsh-plugins
```

### 按需完成一次 Codex 登录

Codex 登录插件不属于默认 Bundle。需要登录时临时安装：

```sh
dsh plugin --profile web add ./packages/codex-login
```

完成首次 OAuth 登录后，凭据已经由 DSH 的 credentials store 保存，插件只负责登录交互，可以卸载：

```sh
dsh plugin --profile web remove dsh-codex-login-plugin
```

等待 DSH 官方提供 Codex 登录入口后，该临时插件即可彻底淘汰。具体流程和限制见 [`packages/codex-login/README.md`](packages/codex-login/README.md)。

### 按需安装其他插件

只需要某个能力时，直接安装对应 package：

```sh
# macOS / Windows 系统通知
dsh plugin --profile web add ./packages/system-notification

# 旧项目兼容：/init（新项目不建议安装）
dsh plugin --profile web add ./packages/init
```

单独安装后的卸载名称是 package 名：

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
dsh plugin --profile web remove dsh-init-plugin
```

不要同时安装 `dsh-plugins` 和 `dsh-system-notification-plugin`，否则同一组件可能被多个 Profile layer 重复插入。Codex 登录插件不在默认 Bundle 中，可以按需临时安装。

## 开发

依赖和检查命令都从仓库根目录执行，并使用 pnpm：

```sh
pnpm install
pnpm check
```

只检查单个 package：

```sh
pnpm --filter dsh-init-plugin run check
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

当前没有根级 `build`、`test`、lint 或 format 脚本；依赖解析记录统一维护在根目录 `pnpm-lock.yaml`。不要在子包中使用 npm/yarn 单独安装依赖。

## 设计约定

- 每个插件通过自身 `package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- `cordis.patch.yml` 只描述要插入的组件 ID 和 package 名称；业务实现留在对应的 `packages/*/src`。
- DSH 不会因为 Bundle 依赖而自动递归激活子 Bundle；默认聚合关系在 `bundles/dsh-plugins/cordis.patch.yml` 中显式声明，目前只插入 `system-notification`。
- Codex 登录 package 自己显式插入 `authorization` 和 `codex-login`，仅在首次登录时按需加载。
- `bundles/dsh-plugins` 使用 `workspace:^` 依赖，是本地工作区聚合 Bundle，目前不用于单独发布到 npm。

各插件的具体行为、平台限制和手动冒烟步骤见对应 package 的 README。

## 迁移背景

迁移到本 monorepo 前的独立仓库保留原提交历史：

- `zz-zhi54/dsh-init-plugin`
- `zz-zhi54/dsh-codex-login-plugin`
