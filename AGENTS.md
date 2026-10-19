# AGENTS.md

## 项目边界

`dsh-plugins` 是 DeepSeek Harness（DSH）插件的 pnpm workspace。根规则只保留全仓库共同约束；每个插件自己的 DSH API、事件、Slot、行为和安全契约放在对应 `packages/<plugin>/AGENTS.md`。

当前 workspace 由 `pnpm-workspace.yaml` 定义为 `packages/*`。所有依赖安装、检查和版本同步都从仓库根目录执行，统一使用 pnpm；不要在子包中生成 `package-lock.json`。

`dsh/` 不属于 pnpm workspace，在该目录工作时同时遵守 `dsh/AGENTS.md`。

## 基本开发规则

常用验证：

```sh
pnpm install
pnpm check
pnpm -r --if-present run test
git diff --check
```

- 修改依赖、workspace、package 入口或 Cordis patch 后必须运行 `pnpm install`。
- 只改文档或纯源码且依赖未变化时，可用 `pnpm install --frozen-lockfile` 检查锁文件一致性。
- 不覆盖、stash、reset、clean 或删除用户已有修改。
- 不使用 force push，不移动已有发布 tag，不自动合并 PR。
- 提交只包含当前任务相关变更，不顺手重构、格式化无关文件或清理旁支问题。
- JavaScript 保持现有 ESM/classic-script 边界、2 空格、单引号、无分号；具体插件约束以其局部 `AGENTS.md` 为准。

## 全局安全边界

- 不提交凭据、OAuth token、真实授权响应、个人配置或其它秘密。
- Host 中的 token、账号标识和上游原始敏感响应不得直接进入日志、错误、HTTP 响应或前端。
- 插件注册的 `/api/*` 路由不能假设自动继承 DSH 浏览器信任边界；返回内容必须按最小必要字段投影。
- 涉及凭据、系统命令、Session 持久事件或 UI Slot 时，先读对应插件的 `AGENTS.md`，不要把根文件复制成第二份插件说明。

## DSH 上游版本兼容

### 版本基线

以 **DeepSeek Harness 已正式发布的最新 RC 或稳定版** 为同步基线。无需等待 Desktop 的发布或更新。

- 以上游正式 GitHub Release 的 `dsh-v<version>` tag 与对应的源码、workspace manifests 为准。
- npm dist-tag 是可安装性校验，master 上尚未发布的代码只能作为观察资料。
- 按上游每个具体包的实际版本分别同步；**禁止将全部 `@deepseek-ai/*` 机械改为相同版本。**
- 官方发布新版本后，检查现有 Issue/PR，及时执行兼容升级。

### 上游新版本兼容流程

1. 记录旧版 → 新版的官方 tag/commit，检查是否已有兼容分支或 PR。
2. 从最新 `main` 建立一次性 `compat/dsh-<version>` 分支；已有同目标 PR 则直接继续。
3. 读取该版本上游依赖清单与 Release Notes，更新本仓库直接使用的 DSH、Cordis、pi-ai 依赖。
4. **运行 `pnpm install` 真实重建锁文件**；禁止仅靠替换版本字符串修改 `pnpm-lock.yaml`。
5. 检查 Service、Event、durable Session event、projection、Authorization、Credentials、Web Server、Client ModuleLoader、Slot、插件生命周期、`engines.dsh` 与插件包元信息等契约。
6. 读取受影响插件的局部 `AGENTS.md`，只做保持既有功能所需的兼容修改与必要测试。
7. 第一次兼容 DSH `0.2.1-rc.2` 时统一准备插件 `0.2.1-rc.2.1`；稳定版 DSH `0.2.1` 首次对应插件 `0.2.1-plugin.1`。
8. 同步必要文档、CHANGELOG 与兼容 Issue，运行：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
9. 兼容分支 PR 直接指向 `main`；不自动合并，合并后可删除临时分支，不维护长期 `dev`。
10. 若需重新设计插件事件体系或生命周期，停止实现并记录 breaking change 及建议，不在兼容 PR 中实施大重构。

仅做兼容升级**不自动发布 Git tag 或 GitHub Release**。

## 插件发布

发布流程仍只在用户明确要求发版时执行，以当前已同步的官方 DSH RC/稳定版为版本前缀：

1. 从最新 `main` 建 `release/<version>`（现有兼容分支可复用），目标 PR 为 `main`。
2. 根与所有 `packages/*/package.json` 使用同一插件版本；当前版本 tag 不存在则直接发当前版本，已存在才递增插件修订号。
3. 更新 `CHANGELOG.md`，必要时同步 README。
4. 运行 `pnpm install`、`pnpm check`、`pnpm -r --if-present run test`、`git diff --check`。
5. 提交 `chore(release): version <version>` 并创建唯一规范 tag `v<version>`；PR 直接指向 `main`，不自动合并或建立 `dev`。
6. 不创建 `dsh-plugins-v<version>` 别名 tag；只有用户明确要求时才创建 GitHub Release。

## 维护规则

- 根 `AGENTS.md` 只维护跨插件规则；插件细节归各自目录的 `AGENTS.md`。
- 新增、删除或更换依赖的 DSH Service、Event、Hook、Slot 或行为语义时同步局部文档，不固定易失效的源码行号。
- `.agents/skills/dsh-upstream-compatibility` 负责官方 RC/稳定版发布后的兼容升级，`.agents/skills/release-version` 负责明确要求的发版，两者都从 `main` 使用一次性分支。
