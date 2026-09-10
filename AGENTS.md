# AGENTS.md

## 项目定位

`dsh-plugins` 是一组 DeepSeek Harness（DSH）插件的 pnpm workspace monorepo。用户安装方式和组件总览见根目录 `README.md`；本文件只记录编码 Agent 容易踩到的项目约束。

- `packages/codex-login`（`dsh-codex-login-plugin`）：临时提供 ChatGPT / Codex OAuth 的 Host 路由和 Web 客户端 UI，仅按需用于首次登录。
- `packages/system-notification`（`dsh-system-notification-plugin`）：旁路监听任务状态和持久化审批事件，发送 macOS / Windows 原生系统通知。
- `packages/init`（`dsh-init-plugin`）：已废弃、兼容保留的 Codex 风格 `/init` 命令；新项目使用 `create-agentsmd` skill。
- `bundles/dsh-plugins`（`dsh-plugins`）：默认只显式组合 `system-notification`，不承载业务实现。
- `dsh/`：DSH 全局目录的源文件，部署到用户全局的 `~/.dsh/`；修改时要区分全局规则与本仓库插件代码。

## 工作区与命令

- 工作区范围由 `pnpm-workspace.yaml` 定义，依赖解析记录只维护根目录 `pnpm-lock.yaml`。
- 从仓库根目录使用 pnpm，不要在子包中用 npm/yarn 安装依赖，也不要提交子包 `package-lock.json`。
- 常用命令：

  ```sh
  pnpm install
  pnpm check
  ```

- `pnpm check` 会递归运行有 `check` 脚本的 package：`init` 检查 Host，`codex-login` 检查 Host 和 classic-script 客户端，`system-notification` 检查 Host、观察器和通知器；Bundle 当前没有源码检查脚本。
- 单包检查和系统通知测试：

  ```sh
  pnpm --filter dsh-init-plugin run check
  pnpm --filter dsh-codex-login-plugin run check
  pnpm --filter dsh-system-notification-plugin run check
  pnpm --filter dsh-system-notification-plugin run test
  ```

- 新增或升级依赖时，从根目录使用 `pnpm --filter <package-name> add <dependency>`，让 pnpm 同步更新 `pnpm-lock.yaml`；不要手工改写锁文件。
- 仓库没有固定的 Node 版本，也没有根级 build、test、lint 或 format 脚本；不要凭空添加或执行不存在的根级命令。
- 当前没有 `.github/workflows` 或额外部署脚本；若新增 CI、测试框架或发布流程，要同步更新本文件和根目录 `README.md`。

## 架构边界

- 运行时代码位于各自 `packages/*/src`；`cordis.patch.yml` 只描述要插入的组件 ID 和 package 名称。
- 每个插件的 `package.json` 通过 `dsh.bundle.patch` 指向自己的 patch。新增、重命名或移除组件时，同时核对 package 的 `exports`、`files`、`dsh` 元数据、patch 和 README。
- `bundles/dsh-plugins/cordis.patch.yml` 必须显式插入 `system-notification`，不要重新加入 `authorization` 或 `codex-login`，也不要依赖 DSH 递归激活 Bundle。
- `/init` 只为旧配置兼容保留。其 Host 通过 `commands` 注册无参数的 `/init`，只允许 Agent 修改仓库根目录的 `AGENTS.md`，不创建 Goal，也不使用 `goal-round-driver`。
- `packages/codex-login/src/host.mjs` 依赖 `authorization` 和 `webServer`，提供 `/api/codex-login/start`、`poll`、`answer`、`cancel` 四个接口；授权成功后凭据由 DSH credentials store 持久化，首次登录完成即可卸载该插件。修改授权状态机、提示投影或 effect 清理时，要同时考虑重复请求、取消和卸载。
- `packages/codex-login/src/client.js` 是 DSH Web 所需的 classic-script 模块，必须保留 `window.__ModuleLoader__.load({ id, factory })` 形状，并通过 `require('react')` 获取 React；不要改成顶层 ESM。等待 DSH 官方 Codex 登录实现后，该临时客户端应被淘汰。
- `system-notification` 只旁路观察 `agent/status` 和持久化 `session/event`，不接管 Agent 循环、审批流程或 answerer；通知失败只能记录，不能反向影响主流程。
- 根工作区和所有 package 当前均为私有本地代码；没有明确发布需求时，不要添加 npm 发布流程或把聚合 Bundle 改成递归 Bundle。

## 验证与变更卫生

1. 修改依赖、工作区配置、入口或 patch 后，从根目录运行 `pnpm install`，再运行 `pnpm check`；仅代码或文档变更可使用 `pnpm install --frozen-lockfile` 做一致性确认。
2. 修改聚合关系时，用已有的 Web Profile 执行 `dsh --profile web --dump-config`，确认默认 Bundle 只包含 `system-notification`，没有重复或缺失的 layer。
3. 修改 OAuth Host 或 Web 客户端时，除语法检查外，手动验证登录入口、授权提示、回答提示和取消流程；OAuth 需要真实的外部授权，不能只靠静态检查确认。
4. 提交前只保留与任务相关的文件变更，不覆盖已有用户修改，也不提交凭据或 OAuth token。

## 代码风格

JavaScript 使用 2 空格缩进、单引号、无分号和简洁命名；ESM Host 使用 `.mjs`；浏览器客户端保持现有 classic-script/CJS 工厂格式；YAML patch 保持现有 `insert` 列表结构和稳定的组件 ID。
