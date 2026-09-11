<!-- deepseek-harness-meta
{
  "name": "dsh-plugins",
  "version": "0.1.5-rc.2.2",
  "tags": ["deepseek", "deepseek-harness", "dsh", "plugins"],
  "description": "非官方 DeepSeek Harness 插件集合，可从 GitHub 按需安装",
  "icon": "https://raw.githubusercontent.com/zz-zhi54/dsh-plugins/v0.1.5-rc.2.2/packages/system-notification/assets/dsh.ico",
  "compatible_versions": ["v0.1.5-rc.2"],
  "screenshots": "packages",
  "install_method": "dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/session-cost'"
}
-->

# dsh-plugins

个人维护的 DeepSeek Harness（DSH）插件集合，以 pnpm workspace monorepo 组织。可独立安装的插件位于 `packages/*`。

> 这是个人维护的非官方社区项目，不隶属于 DeepSeek AI 或 DeepSeek Harness 官方团队。
>
> 本 README 是用户入口，负责项目选择、安装方式和仓库结构；各项目 README 负责记录自身的具体行为和限制。安装章节会列出当前 workspace 中的插件及版本示例；实际版本、DSH 兼容关系及发布记录请以 [`CHANGELOG.md`](CHANGELOG.md) 和各项目的 `package.json` 为准。

## 项目总览

| 项目 | 类型 | 包名 | 用途 | 详细说明 |
| --- | --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | 按需插件 | `dsh-system-notification-plugin` | 旁路监听任务状态和审批事件，发送 macOS / Windows 原生系统通知 | [`README`](packages/system-notification/README.md) |
| [`packages/codex-login`](packages/codex-login/) | 按需临时插件 | `dsh-codex-login-plugin` | 提供 ChatGPT / Codex OAuth 登录入口；首次登录完成后即可卸载 | [`README`](packages/codex-login/README.md) |
| [`packages/codex-usage`](packages/codex-usage/) | 按需插件 | `dsh-codex-usage-plugin` | 在输入框下方显示 Codex 的 5 小时 / 每周额度与重置倒计时，复用 DSH 自己的 Codex 凭据 | [`README`](packages/codex-usage/README.md) |
| [`packages/session-cost`](packages/session-cost/) | 按需插件 | `dsh-session-cost-plugin` | 在 Token 统计行下方显示当前会话的 provider/model 费用与 USD 统计 | [`README`](packages/session-cost/README.md) |
| [`packages/plugin-manager`](packages/plugin-manager/) | 按需插件 | `dsh-plugin-manager` | 在设置页面管理 Web Profile 插件的安装、更新、删除和结果查看 | [`README`](packages/plugin-manager/README.md) |

### 项目关系

- 每个插件都可以独立安装、更新和卸载，不再维护组合 pack。
- Codex 用量插件读取同一份 `llm-pi-ai/openai-codex` 凭据；它只读凭据、不写凭据，也不自己刷新 token。
- Codex 登录插件仅用于首次登录；登录完成后即可卸载。

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

## 安装、卸载与更新

每个插件都从 GitHub 的 `packages/*` 子目录独立安装，不需要 clone、进入仓库或预装其它插件。

### 安装

当前 workspace 中有以下 5 个可独立安装的插件（版本示例取自各自的 `package.json`）：

| 插件目录 | package name | 版本示例 | 用途 |
| --- | --- | --- | --- |
| `packages/system-notification` | `dsh-system-notification-plugin` | `0.1.5-rc.2.2` | macOS / Windows 系统通知 |
| `packages/codex-login` | `dsh-codex-login-plugin` | `0.1.5-rc.2.2` | 首次 ChatGPT / Codex 登录 |
| `packages/codex-usage` | `dsh-codex-usage-plugin` | `0.1.5-rc.2.2` | Codex 额度显示 |
| `packages/session-cost` | `dsh-session-cost-plugin` | `0.1.5-rc.2.2` | Session 费用显示 |
| `packages/plugin-manager` | `dsh-plugin-manager` | `0.1.5-rc.2.2` | 设置页面管理 Web Profile 插件 |

从当前默认分支安装单个插件：

```sh
# 系统通知
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/system-notification'

# Codex 登录
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/codex-login'

# Codex 额度
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/codex-usage'

# Session 费用
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/session-cost'

# 插件管理器
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/plugin-manager'
```

也可以一次安装全部插件：

```sh
dsh plugin --profile web add \
  'github:zz-zhi54/dsh-plugins#path:packages/system-notification' \
  'github:zz-zhi54/dsh-plugins#path:packages/codex-login' \
  'github:zz-zhi54/dsh-plugins#path:packages/codex-usage' \
  'github:zz-zhi54/dsh-plugins#path:packages/session-cost' \
  'github:zz-zhi54/dsh-plugins#path:packages/plugin-manager'
```

已安装插件需要更新时，重新执行对应的 `add` 命令即可；使用固定 release 时，将命令中的版本标签替换为新版本。

固定 release 时，在路径前加入版本标签。以版本 `v0.1.5-rc.2.2` 为例：

```sh
# 系统通知
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.5-rc.2.2&path:packages/system-notification'

# Codex 登录
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.5-rc.2.2&path:packages/codex-login'

# Codex 额度
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.5-rc.2.2&path:packages/codex-usage'

# Session 费用
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.5-rc.2.2&path:packages/session-cost'

# 插件管理器
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.5-rc.2.2&path:packages/plugin-manager'
```

安装后检查 Profile：

```sh
dsh --profile web --dump-config
```

### 卸载

按 package name 卸载对应插件：

```sh
# 系统通知
dsh plugin --profile web remove dsh-system-notification-plugin

# Codex 登录
dsh plugin --profile web remove dsh-codex-login-plugin

# Codex 额度
dsh plugin --profile web remove dsh-codex-usage-plugin

# Session 费用
dsh plugin --profile web remove dsh-session-cost-plugin

# 插件管理器
dsh plugin --profile web remove dsh-plugin-manager
```

只卸载实际安装过的插件即可。

需要某项能力时，也可以进入对应项目 README 查看更具体的行为、限制和验证步骤：

- [Codex 登录插件](packages/codex-login/README.md)
- [Codex 用量插件](packages/codex-usage/README.md)
- [Session 费用插件](packages/session-cost/README.md)
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
pnpm --filter dsh-session-cost-plugin run check
pnpm --filter dsh-session-cost-plugin run test
pnpm --filter dsh-plugin-manager run check
pnpm --filter dsh-plugin-manager run test
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

根工作区没有统一的 `build`、`test`、lint 或 format 脚本；依赖解析记录统一维护在根目录 `pnpm-lock.yaml`。本地 workspace 保持 pnpm 默认的 peer 自动安装行为。不要在子项目中使用 npm/yarn 单独安装依赖。

## 仓库结构与文档分工

- `packages/*/src`：各插件的运行时代码。
- `packages/*/cordis.patch.yml`：对应插件要插入的 Profile 条目。
- [`CHANGELOG.md`](CHANGELOG.md)：版本、兼容关系和发布记录。
- `AGENTS.md`：面向编码 Agent 的项目约束，不是用户使用手册。
- `dsh/`：部署到用户全局 `~/.dsh/` 的 DSH 源文件，不属于 pnpm workspace。

插件通过自身 `package.json` 的 `dsh.bundle.patch` 指向 patch 文件；patch 只描述组件 ID 和 package 名称，业务实现留在对应项目中。每个插件都可独立安装，不需要组合层或递归依赖。

## 许可证

本项目代码采用 [Apache License 2.0](LICENSE)。第三方依赖及 DeepSeek Harness 本身仍以各自的许可证和条款为准。
