# AGENTS.md

## 项目概览

`dsh-plugins` 是一组 DeepSeek Harness（DSH）插件的 pnpm workspace monorepo，运行时代码使用 JavaScript ESM，并通过 Cordis Profile patch 接入 DSH。用户安装入口、组件关系和各项目说明以根目录 `README.md` 及各 package README 为准；本文件只记录编码 Agent 容易踩到的项目约束。

- `packages/system-notification`（`dsh-system-notification-plugin`）：旁路监听任务完成和持久化审批事件，发送 macOS / Windows 原生系统通知。
- `packages/codex-login`（`dsh-codex-login-plugin`）：临时提供 ChatGPT / Codex OAuth 的 Host 路由和 Web 客户端 UI，仅按需用于首次登录。
- `packages/codex-usage`（`dsh-codex-usage-plugin`）：在 Web 输入框下方显示 Codex 5 小时 / 每周额度；只读 `llm-pi-ai/openai-codex` 凭据并请求 `wham/usage`，不依赖 codex CLI。
- `packages/session-cost`（`dsh-session-cost-plugin`）：在 Web 输入框下方显示按 `provider/model` 分组的 Session USD 费用；从 durable Session events 重算，不新增持久化。
- `packs/default`（`dsh-default`）：显式组合 `system-notification` 和 `session-cost`，不承载业务实现。
- `packs/codex`（`dsh-codex`）：显式组合 `authorization`、`codex-login` 和 `codex-usage`，不承载业务实现。
- `dsh/`：部署到用户全局 `~/.dsh/` 的 DSH 源文件，不属于 pnpm workspace；在该目录工作时还要遵守 `dsh/AGENTS.md`。

## 工作区与设置

- 工作区范围由 `pnpm-workspace.yaml` 定义：`packages/*` 和 `packs/*`。
- 所有命令从仓库根目录执行，并使用 pnpm；不要在子项目中用 npm/yarn 安装依赖，也不要提交子包的 `package-lock.json`。
- 安装依赖：

  ```sh
  pnpm install
  ```

- 依赖解析记录只维护根目录 `pnpm-lock.yaml`。新增或升级依赖时使用：

  ```sh
  pnpm --filter <package-name> add <dependency>
  ```

- 工作区本身没有统一固定 Node 版本，也没有数据库、环境变量初始化步骤或统一构建产物；但 `session-cost` 使用的 `@earendil-works/pi-ai@0.85.1` 要求 Node `>=22.19.0`。根 `package.json` 当前只提供递归 `check` 脚本，没有根级 `build`、`test`、`lint` 或 `format` 脚本。

## 开发、检查与测试

- 运行所有已有 package 检查：

  ```sh
  pnpm check
  ```

  该命令递归执行各 package 的 `check` 脚本：`codex-login` 检查 Host 和 classic-script 客户端，`codex-usage` 检查额度 Host、纯逻辑模块和 classic-script 客户端，`session-cost` 检查 Host、费用逻辑和 classic-script 客户端，`system-notification` 检查 Host、观察器和通知器；插件组合当前没有源码检查脚本。

- 运行单包检查：

  ```sh
  pnpm --filter dsh-codex-login-plugin run check
  pnpm --filter dsh-codex-usage-plugin run check
  pnpm --filter dsh-session-cost-plugin run check
  pnpm --filter dsh-system-notification-plugin run check
  ```

- 运行系统通知单元测试（Node 内置 `node:test`）：

  ```sh
  pnpm --filter dsh-system-notification-plugin run test
  ```

  测试位于 `packages/system-notification/test/`，覆盖事件观察、去重、平台命令选择以及 macOS / Windows 命令转义。修改观察器或通知器时应同步更新测试。

- 运行 Codex 用量单元测试：

  ```sh
  pnpm --filter dsh-codex-usage-plugin run test
  ```

  测试位于 `packages/codex-usage/test/`，覆盖响应归一化、凭据过期短路，以及"access token 只能出现在上游请求头里"的脱敏回归。修改投影或脱敏逻辑时必须同步更新测试。

- 运行 Session 费用单元测试：

  ```sh
  pnpm --filter dsh-session-cost-plugin run test
  ```

  测试位于 `packages/session-cost/test/`，覆盖 usage 归一化、provider/model 分组计费、未知价格以及 durable Session snapshot 读取。修改费用投影或 Host 路由时应同步更新测试。

- 修改依赖、workspace 配置、package 入口或 Cordis patch 后，运行 `pnpm install` 和 `pnpm check`。仅代码或文档变更可用 `pnpm install --frozen-lockfile` 做锁文件一致性确认。
- 需要验证实际 Profile 时使用已有的 DSH Web Profile：

  ```sh
  dsh --profile web --dump-config
  ```

  默认组合应出现 `system-notification` 和 `session-cost`；不应因为安装默认组合出现 `authorization`、`codex-login` 或 `codex-usage`。Codex 组合应出现 `authorization`、`codex-login` 和 `codex-usage`，不自动出现 `session-cost`。这类命令依赖本机 DSH 安装，不能用仓库的静态检查替代运行时验证。
- 修改 OAuth Host 或 Web 客户端时，除语法检查外还要手动验证登录入口、授权提示、回答提示和取消流程；OAuth 流程需要真实的外部授权。

## 架构边界与修改规则

- 运行时代码位于各自 `packages/*/src`；`packages/*/cordis.patch.yml` 只描述需要插入的组件 ID 和 package 名称。
- 每个插件的 `package.json` 通过 `dsh.bundle.patch` 指向自己的 patch。新增、重命名或移除组件时，要同步核对 `exports`、`files`、`dsh` 元数据、patch 和 README。
- `packs/default/cordis.patch.yml` 必须显式插入 `system-notification` 和 `session-cost`；`packs/codex/cordis.patch.yml` 必须显式插入 `authorization`、`codex-login` 和 `codex-usage`。不要依赖 DSH 因组合依赖自动递归激活子组合。`dsh-default` 和 `dsh-system-notification-plugin` / `dsh-session-cost-plugin` 二选一安装；`dsh-codex` 与 `codex-login` / `codex-usage` 子包也二选一，避免重复插入同一 Profile 条目。
- `packages/codex-login/src/host.mjs` 依赖 `authorization` 和 `webServer`，提供 `/api/codex-login/start`、`poll`、`answer`、`cancel` 四个接口；授权成功后凭据由 DSH credentials store 持久化，首次登录完成即可卸载插件。修改授权状态机、提示投影、重复请求、取消或卸载清理时要覆盖相应边界。
- `packages/codex-login/src/client.js` 是 DSH Web 所需的 classic-script 模块，必须保留 `window.__ModuleLoader__.load({ id, factory })` 形状，并通过 `require('react')` 获取 React；不要改成顶层 ESM。
- `packages/codex-usage` 的 Host 只依赖 `webServer`（必需）和 `credentials`（可选），注册 `GET /api/codex-usage`。它**只读**凭据记录，绝不调用 `modifyRecord`，也绝不实现 OAuth 刷新 —— pi-ai 的刷新发生在 `credentials.modifyRecord()` 内部，两个进程并发轮换同一个 refresh token 会丢掉先写入的一份。
- `packages/codex-usage` **必须按次惰性调用 `ctx.get('credentials')`，不能在 `apply()` 里取一次并缓存**。Cordis 的 `ctx.get` 默认 strict，只在提供方 fiber 处于 active 状态时返回；`dsh-credentials-local` 的 `[Service.init]()` 要先读凭据文件并启动文件监视，而插件树是并发激活的，所以 apply 时可能拿到 `undefined` 并被永久缓存。同理，失败结果不进结果缓存，保证"稍后就绪"能自愈。
- `packages/codex-usage` 的请求特征（端点、请求头、User-Agent、响应字段、脱敏写法）刻意与 pi-ai / `@narumitw/pi-codex-usage` 对齐，对齐表同时写在 `src/codex-usage.mjs` 文件头和该包 README；上游更新时按表同步，不要只改一处。
- `packages/codex-usage/src/client.js` 同样是 classic-script 模块，注册进 `conversation.composer.dock`（`id: codex-usage`、`order: 1`），样式全部内联，不向 `document` 注入全局 CSS。它每 5 分钟轮询一次，**连续 3 次失败后暂停轮询**，只等用户点击重试（失败态本身是可点击按钮）——不要改成无限重试。
- `packages/session-cost` 的 Host 依赖 `sessions` 与 `webServer`，注册 `GET /api/session-cost`；费用从当前 Session 的 durable snapshot 重算，并按 Session `seq` 做进程内缓存。其 Client 注册 `conversation.composer.dock` 的 `stats`（`order: 0`）以替换 DSH 内置统计单元；与 `codex-usage` 并装时，后者使用独立的 `codex-usage`（`order: 1`）条目，必须保持这两个 Slot 契约。
- `system-notification` 只旁路观察持久化 `session/event`，不接管 Agent 循环、审批流程或 answerer。它监听 `turn/end` 的 `completed` 结果和去重后的 `approval/asked`；通知失败只能记录 warning，不能反向影响主流程。
- 修改 `packages/system-notification/assets/dsh.ico` 或 Windows 通知脚本时，保留路径转义测试，并确认资源仍包含在 package 的 `files` 中。

## 代码风格

- JavaScript 使用 2 空格缩进、单引号、无分号和简洁命名；Host 使用 `.mjs`。
- 浏览器客户端保持现有 classic-script/CJS 工厂格式，不要引入需要单独 ESM 构建的语法或入口。
- YAML patch 保持现有 `insert` 列表结构和稳定的组件 ID。
- 注释只解释非显而易见的生命周期、兼容性、业务约束或安全决策；不要用注释重复 README 或代码本身已经表达的内容。

## 安全、发布与变更卫生

- 不提交凭据、OAuth token、个人配置或真实授权响应。Codex 登录成功后的凭据由 DSH credentials store 管理，插件不应自行持久化敏感信息。
- **凭据与身份信息一律不出 Host（硬性要求）。** access token / refresh token 只允许出现在发往上游的请求头里：不写日志、不进错误信息、不进 HTTP 响应、不落盘、不进前端。
- **脱敏必须覆盖身份字段，而不只是 token。** 任何上游响应片段在进入错误信息、日志或界面之前都要先过 `redact()`；它要同时掩掉 `Bearer` 值、`access_token` / `refresh_token` / `access` / `refresh` 字段，以及 `email` / `user_id` / `account_id`（snake_case 与 camelCase 都要覆盖），并用邮箱形态做兜底。脱敏后仍要保留可排障的信息（错误码、错误文本），不要一删了之。
- **上游响应只允许以投影后的标量离开 Host。** 不要图省事把原始响应体整体转发、整体 `JSON.stringify` 或塞进错误信息。新接一个上游接口时，先明确"哪几个字段可以离开 Host"，再写投影函数。
- **插件自己注册的 `/api/*` 路由不在 DSH 的浏览器信任栅栏内。** 该栅栏是 `dsh-client-connection` 的私有逻辑，只守它自己的 RPC 通道（已实测：伪造 Host 时首页 401、插件路由仍 200）。因此这些路由上不要返回凭据、身份信息或其它敏感数据。
- **改动涉及凭据的代码前先读该包文件头的安全边界，并同步补/改脱敏回归测试。** `packages/codex-usage` 是现成范例：边界写在 `src/codex-usage.mjs` 文件头，回归测试在 `test/codex-usage.test.mjs`（覆盖 token、身份字段、裸邮箱，以及"失败原因不含 email / user_id / account_id"）。
- 系统通知调用操作系统原生命令；修改命令参数、AppleScript 或 PowerShell 拼接时要保留输入转义，并保证通知失败被隔离在旁路逻辑内。
- 根工作区和所有 package 当前均为私有本地代码。没有明确发布需求时，不要添加 npm 发布流程，也不要把插件组合改成递归组合。
- 发布版本时，在 `dev` 分支同步根目录、插件和组合的版本号，更新相关 README、兼容关系和 `CHANGELOG.md`；然后运行 `pnpm install`、`pnpm check` 及受影响插件测试，提交 `chore(release): version <version>`，创建并推送 `dsh-plugins-v<version>` 标签，再将 `dev` 快进合并到 `main`。发布完成后确认 `dev`、`main` 和标签指向同一提交且工作区干净。禁止改写历史或强制推送。
- 提交前只保留与任务相关的变更，不覆盖已有用户修改。仓库当前没有固定 CI 或 PR 标题格式；提交说明应包含受影响 package、行为变化和验证命令。
