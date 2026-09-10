# dsh-plugins

DeepSeek Harness（DSH）插件的 pnpm workspace monorepo。插件实现分别位于 `packages/*`，`bundles/dsh-plugins` 只负责把常用插件组合成一个可安装的 Bundle。

## 文档分工

- 根目录 `README.md`：安装方式、组件总览和开发命令。
- 各 package 的 `README.md`：该插件的行为和专项验证方式。
- `AGENTS.md`：面向编码 Agent 的约束，不作为用户使用手册。
- `dsh/`：DSH 全局目录的源文件，部署到用户全局的 `~/.dsh/`；不属于 pnpm workspace，也不参与插件 Bundle。

## 组件

| 类型 | 路径 | 包名 | 插入的 Profile 条目 | 说明 |
| --- | --- | --- | --- | --- |
| 插件 | `packages/codex-login` | `dsh-codex-login-plugin` | `authorization`、`codex-login` | 在 Web 模型设置中提供 ChatGPT / Codex OAuth 登录，当前推荐使用 |
| 插件 | `packages/system-notification` | `dsh-system-notification-plugin` | `system-notification` | 发送 macOS / Windows 原生任务和审批通知，当前推荐使用 |
| 兼容插件 | `packages/init` | `dsh-init-plugin` | `command-init` | 已废弃的 `/init`，仅为旧配置保留；新项目使用 `create-agentsmd` skill |
| 聚合 Bundle | `bundles/dsh-plugins` | `dsh-plugins` | `authorization`、`codex-login`、`system-notification` | 一次启用两个推荐插件；不包含 `command-init` |

## 安装

### 一次安装推荐插件

在仓库根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
```

安装后检查最终 Profile：

```sh
dsh --profile web --dump-config
```

配置中应出现 `authorization`、`codex-login` 和 `system-notification`，不应出现已废弃的 `command-init`。

卸载整套 Bundle：

```sh
dsh plugin --profile web remove dsh-plugins
```

### 按需单独安装

只需要某个能力时，直接安装对应 package：

```sh
# ChatGPT / Codex OAuth 登录
dsh plugin --profile web add ./packages/codex-login

# macOS / Windows 系统通知
dsh plugin --profile web add ./packages/system-notification

# 旧项目兼容：/init（新项目不建议安装）
dsh plugin --profile web add ./packages/init
```

单独安装后的卸载名称是 package 名：

```sh
dsh plugin --profile web remove dsh-codex-login-plugin
dsh plugin --profile web remove dsh-system-notification-plugin
dsh plugin --profile web remove dsh-init-plugin
```

不要同时安装 `dsh-plugins` 和它包含的独立插件，否则同一组件可能被多个 Profile layer 重复插入。

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
- DSH 不会因为 Bundle 依赖而自动递归激活子 Bundle；聚合关系必须在 `bundles/dsh-plugins/cordis.patch.yml` 中显式声明。
- `bundles/dsh-plugins` 使用 `workspace:^` 依赖，是本地工作区聚合 Bundle，目前不用于单独发布到 npm。

各插件的具体行为、平台限制和手动冒烟步骤见对应 package 的 README。

## 迁移背景

迁移到本 monorepo 前的独立仓库保留原提交历史：

- `zz-zhi54/dsh-init-plugin`
- `zz-zhi54/dsh-codex-login-plugin`
