# dsh-plugins

个人维护的 DeepSeek Harness（DSH）插件集合，以 pnpm workspace monorepo 组织。可独立安装的插件位于 `packages/*`，插件组合位于 `packs/*`。

> 这是个人维护的非官方社区项目，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。
>
> 本 README 是用户入口，负责项目选择、安装方式和仓库结构；各项目 README 负责记录自身的具体行为和限制。版本号、DSH 兼容关系及发布记录请以 [`CHANGELOG.md`](CHANGELOG.md) 和各项目的 `package.json` 为准，本文不固定具体版本号。

## 项目总览

| 项目 | 类型 | 包名 | 用途 | 详细说明 |
| --- | --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | 插件；默认组合成员 | `dsh-system-notification-plugin` | 旁路监听任务状态和审批事件，发送 macOS / Windows 原生系统通知 | [`README`](packages/system-notification/README.md) |
| [`packages/codex-login`](packages/codex-login/) | 按需临时插件 | `dsh-codex-login-plugin` | 提供 ChatGPT / Codex OAuth 登录入口；首次登录完成后即可卸载 | [`README`](packages/codex-login/README.md) |
| [`packages/codex-usage`](packages/codex-usage/) | 按需插件 | `dsh-codex-usage-plugin` | 在输入框下方显示 Codex 的 5 小时 / 每周额度与重置倒计时，复用 DSH 自己的 Codex 凭据 | [`README`](packages/codex-usage/README.md) |
| [`packs/default`](packs/default/) | 默认组合 | `dsh-default` | 默认启用系统通知插件，不承载业务实现 | [`README`](packs/default/README.md) |
| [`packs/codex`](packs/codex/) | Codex 组合 | `dsh-codex` | 同时启用 Codex 登录和额度显示，不承载业务实现 | [`README`](packs/codex/README.md) |

### 项目关系

- `dsh-default` 只显式启用 `system-notification`。
- `dsh-codex` 同时启用 Codex 登录和额度显示；登录成功后可以改为单独安装用量插件。
- Codex 用量插件读取同一份 `llm-pi-ai/openai-codex` 凭据；它只读凭据、不写凭据，也不自己刷新 token。
- `dsh-default` 和 `dsh-system-notification-plugin` 二选一，不要同时安装，以免重复插入同一 Profile 条目。

## 设计原则

- **最小依赖、最少代码**：只引入完成目标所需的依赖，优先复用 DSH 已提供的服务和扩展点。
- **轻量、稳定**：围绕实际使用场景提供小而明确的能力，不追求覆盖所有场景，优先控制维护成本。
- **最小侵入**：插件以独立 Profile layer 接入，不修改 DSH 核心，不接管 Agent 循环、审批流程或其他主流程。
- **开放协作**：欢迎社区通过 Issue 和 Pull Request 提交问题、建议、文档、测试或实现；贡献应尽量保持独立、低依赖和低侵入。
- **稳定优先**：优先保持现有行为和公开契约；通知等旁路能力失败时，不应影响 DSH 主流程。
- **上游优先、可撤销**：当 DSH 官方提供等价能力时，对应插件会停止维护、标记废弃并删除，而不是长期保留重复实现。

## 参与贡献

如果你有希望加入的能力、使用中的问题或改进建议，欢迎提交 Issue；如果已经有可行实现，也欢迎直接提交 Pull Request。新增或修改内容请尽量遵循以下原则：

- 保持功能边界清晰，不做与 DSH 主流程无关的大范围改动；
- 优先使用 DSH 已有的公开服务和扩展点，避免引入不必要的依赖；
- 同步补充必要的测试和文档，并说明验证方式；
- 尊重上游方向；当 DSH 官方提供等价能力时，及时讨论迁移或删除方案。

## 安装

当前安装入口使用仓库路径；命令均从仓库根目录执行。先获取源码并进入目录：

```sh
git clone https://github.com/zz-zhi54/dsh-plugins.git
cd dsh-plugins
```

### 默认启用系统通知

安装默认组合：

```sh
dsh plugin --profile web add ./packs/default
```

检查 Profile：

```sh
dsh --profile web --dump-config
```

在没有额外插件的情况下，应出现 `system-notification`，不应出现 `authorization`、`codex-login` 或 `codex-usage`。

卸载默认组合：

```sh
dsh plugin --profile web remove dsh-default
```

### 启用 Codex 组合

安装 Codex 组合：

```sh
dsh plugin --profile web add ./packs/codex
```

安装后应出现 `authorization`、`codex-login` 和 `codex-usage`。登录成功后，如只需查看额度，可卸载 `dsh-codex` 并按 Codex 用量插件 README 单独安装。

卸载 Codex 组合：

```sh
dsh plugin --profile web remove dsh-codex
```

### 按需安装单个项目

需要某项能力时，直接进入对应项目 README，按其中的安装、卸载和验证步骤操作：

- [Codex 登录插件](packages/codex-login/README.md)
- [Codex 用量插件](packages/codex-usage/README.md)
- [系统通知插件](packages/system-notification/README.md)

## 开发

依赖安装和检查都从仓库根目录执行，并使用 pnpm：

```sh
pnpm install
pnpm check
```

只检查单个项目：

```sh
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-codex-usage-plugin run check
pnpm --filter dsh-codex-usage-plugin run test
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

根工作区没有统一的 `build`、`test`、lint 或 format 脚本；依赖解析记录统一维护在根目录 `pnpm-lock.yaml`。不要在子项目中使用 npm/yarn 单独安装依赖。

## 仓库结构与文档分工

- `packages/*/src`：各插件的运行时代码。
- `packages/*/cordis.patch.yml`：对应插件要插入的 Profile 条目。
- `packs/*/cordis.patch.yml`：各插件组合的显式关系。
- [`CHANGELOG.md`](CHANGELOG.md)：版本、兼容关系和发布记录。
- `AGENTS.md`：面向编码 Agent 的项目约束，不是用户使用手册。
- `dsh/`：部署到用户全局 `~/.dsh/` 的 DSH 源文件，不属于 pnpm workspace，也不参与插件组合。

插件通过自身 `package.json` 的 `dsh.bundle.patch` 指向 patch 文件；patch 只描述组件 ID 和 package 名称，业务实现留在对应项目中。DSH 不会因为组合依赖而自动递归激活子组合。

## 许可证

本项目代码采用 [Apache License 2.0](LICENSE)。第三方依赖及 DeepSeek Harness 本身仍以各自的许可证和条款为准。

## 迁移背景

迁移到本 monorepo 前的独立仓库保留原提交历史：

- `zz-zhi54/dsh-codex-login-plugin`
