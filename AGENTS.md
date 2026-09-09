# AGENTS.md

## 项目概览

`dsh-plugins` 是一组 DeepSeek Harness（DSH）插件的 pnpm workspace monorepo。代码以原生 ESM 的 JavaScript 为主，使用 Cordis patch YAML 把插件插入 DSH Profile；各插件 package 标记为私有，`bundles/dsh-plugins` 通过 workspace 相对依赖定位为本地聚合 Bundle，目前不用于独立发布。

- `packages/init`（`dsh-init-plugin`）：已废弃、兼容保留的 Codex 风格 `/init` 命令；新项目使用 `create-agentsmd` skill。
- `packages/codex-login`（`dsh-codex-login-plugin`）：提供 ChatGPT / Codex OAuth 的 Host 路由和 Web 客户端 UI。
- `packages/system-notification`（`dsh-system-notification-plugin`）：旁路监听任务状态和持久化审批事件，发送 macOS / Windows 原生系统通知。
- `bundles/dsh-plugins`（`dsh-plugins`）：只负责组合上述插件及 `@deepseek-ai/dsh-authorization`，不承载业务实现。

工作区范围由 `pnpm-workspace.yaml` 定义，根目录的 `pnpm-lock.yaml` 是依赖解析记录。各 package 的 `package.json` 中的 `dsh.bundle.patch` 是插件组合入口；不要假设 DSH 会递归激活依赖 Bundle，组合关系应在 patch 中显式声明。

## 环境与常用命令

在仓库根目录执行命令，使用 pnpm，不要在子包中用 npm/yarn 另行安装依赖：

```sh
pnpm install
pnpm check
```

`pnpm check` 会递归运行有 `check` 脚本的 workspace package：

- `packages/init`：`node --check src/host.mjs`
- `packages/codex-login`：分别检查 `src/host.mjs` 和 `src/client.js`
- `packages/system-notification`：检查 Host、事件观察器和原生通知器模块
- `bundles/dsh-plugins`：当前没有源码检查脚本

只检查单个插件时可运行：

```sh
pnpm --filter dsh-init-plugin run check
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

新增或升级依赖时，从根目录使用 pnpm workspace filter，并同步检查 `pnpm-lock.yaml`：

```sh
pnpm --filter <package-name> add <dependency>
```

没有固定的 Node 版本、根级 build/lint/format 脚本或根级测试脚本；不要把不存在的 `pnpm test`、`pnpm build` 当作项目验证命令。需要时运行具体 package 的检查或测试脚本。依赖安装或锁文件必须保持可重复，锁文件不应手工改写。

## 本地 DSH 验证

需要验证最终 Profile 时，先确保本机已有可用的 `dsh` CLI 和 Web Profile，然后在根目录执行：

```sh
dsh plugin --profile web add ./bundles/dsh-plugins
dsh --profile web --dump-config
```

配置中应出现 `authorization`、`codex-login`、`system-notification`，不应再出现已废弃的 `command-init`。新项目使用 `create-agentsmd` skill。卸载整套本地 Bundle：

```sh
dsh plugin --profile web remove dsh-plugins
```

也可以只安装一个插件：

```sh
dsh plugin --profile web add ./packages/init
dsh plugin --profile web add ./packages/codex-login
dsh plugin --profile web add ./packages/system-notification
```

不要同时安装 `dsh-plugins` 和它包含的独立插件，否则同一 layer 可能被重复插入。`/init` 仅为旧配置兼容保留，新项目使用 `create-agentsmd` skill；安装后可在 Web 中通过 `/` 检查旧的 `/init` 命令，并在模型设置页检查 ChatGPT / Codex 登录入口；OAuth 流程需要真实的外部授权，不能只靠语法检查验证。

## 架构边界与修改规则

- 插件运行时代码位于各自 `packages/*/src`；`cordis.patch.yml` 只描述应插入的组件 ID 和 package 名称。新增、重命名或移除组件时，要同时核对 `package.json` 的 exports、patch 和 README。
- `packages/init/src/host.mjs` 通过 `commands` 注册已废弃的 `/init`。该命令不接受参数，触发的是普通 user follow-up；其 prompt 明确限制 Agent 只能写当前仓库根目录的 `AGENTS.md`，不创建 Goal，也不使用 `goal-round-driver`。新项目使用 `create-agentsmd` skill。
- `packages/codex-login/src/host.mjs` 使用 `authorization` 和 `webServer`，提供 `/api/codex-login/start`、`poll`、`answer`、`cancel` 四个接口，并在 effect 清理时注销路由和取消进行中的授权。修改授权状态机、提示投影或路由时，同时考虑重复请求、取消和 effect 卸载。
- `packages/codex-login/src/client.js` 是已经按 DSH Web 要求写好的 classic-script 模块，不是普通 ESM 源文件。它必须保留 `window.__ModuleLoader__.load({ id, factory })` 形状，并通过 `require('react')` 获取 React；不要把它改成顶层 `import`/`export` 或直接当作浏览器可执行的 ESM。
- `bundles/dsh-plugins/cordis.patch.yml` 必须显式插入 `authorization`、`codex-login` 和 `system-notification`；已废弃的 `command-init` 不再由统一 Bundle 插入。Bundle 只做聚合，不要把插件实现复制到 `bundles/dsh-plugins`。
- 保持 package 的 `exports`、`files` 和 `dsh` 元数据与实际入口一致。根工作区是私有本地聚合，不要在没有明确发布需求时添加 npm 发布流程或改成递归 Bundle。

## 代码风格

遵循相邻代码和现有 package 的风格：JavaScript 使用 2 空格缩进、单引号、无分号、简洁的函数/常量命名；优先保持原生 Node/Web API 和显式的数据流。ESM Host 文件使用 `.mjs`，浏览器客户端保持现有 classic-script/CJS 工厂格式。YAML patch 保持现有的 `insert` 列表结构和稳定的组件 ID。

## 变更后的验证清单

1. 依赖、入口或 patch 发生变化时，从根目录运行 `pnpm install`（锁文件没有必要变化时可用 `pnpm install --frozen-lockfile`）并运行 `pnpm check`。
2. 修改插件组合时运行 `dsh --profile web --dump-config`，确认没有重复或缺失的 layer。
3. 修改 OAuth Host 或 Web 客户端时，除语法检查外，使用 Web Profile 做一次登录入口、授权提示、回答提示和取消流程的手动冒烟验证。
4. 提交前只保留与任务相关的文件变更；不要覆盖工作区中已有的用户修改或提交凭据、OAuth token 等敏感信息。

仓库当前没有 `.github/workflows` 或额外的部署脚本；若新增 CI、测试框架或发布流程，应同步更新本文件和根目录 `README.md` 的对应说明。
