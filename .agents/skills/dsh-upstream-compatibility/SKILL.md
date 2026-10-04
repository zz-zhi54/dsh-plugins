---
name: dsh-upstream-compatibility
description: 当 DeepSeek Harness Desktop 实际内置的 DSH runtime 升级后，同步 dsh-plugins 的兼容性。Desktop runtime 是发布基线；上游 Git tags / Release Notes / master 只用于提前观察和源码审计。每次从 main 创建一次性兼容分支并直接 PR 回 main，不维护 dev 分支。
compatibility: 需要 Git、Node.js、pnpm 和 GitHub 访问能力；运行时验证需要对应版本的 DSH Desktop。
---

# DSH Desktop 兼容

## 目标

只在 **Desktop 实际 runtime 版本变化** 后更新兼容基线，并只做保持现有插件行为所必需的修改。

## 版本源

发布与兼容的基线：

**DeepSeek Harness Desktop 当前实际内置的 DSH runtime 版本。**

上游信息的角色：

- Git tags / Releases：提前观察将来的变化；
- master：必要时确认尚未发布的实现；
- npm 包版本：只用于解析具体依赖，不决定本仓库发布基线。

不能因为上游出现新 tag 就提前升级插件 peerDependencies。只有 Desktop runtime 已升级，才进入下面流程。

## 流程

1. 记录 Desktop runtime：旧版本 → 新版本。
2. 搜索现有兼容 Issue、`compat/desktop-<version>` 分支和 PR，避免重复。
3. 从最新 `main` 创建 `compat/desktop-<version>`。
4. 找到该 Desktop runtime 对应的上游 tag/commit，读取 workspace/package 配置，只升级本仓库实际使用的 DSH/Cordis 包到各自真实版本。
   - 禁止把全部 `@deepseek-ai/*` 统一替换成同一个版本。
5. 运行：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
6. 阅读对应 Release Notes 并比较相关源码 diff，重点检查：
   - package exports / import paths；
   - Host Service；
   - Cordis Event；
   - durable Session event；
   - Session Projection；
   - Authorization / Credentials；
   - Web Server；
   - Client ModuleLoader；
   - Web Slot；
   - plugin lifecycle / HMR；
   - config schema。
7. 读取受影响插件目录的 `AGENTS.md`，按依赖面和行为契约回到实际源码确认。
8. 分类：
   - **无需运行时修改**：只同步依赖、lockfile、版本和必要文档；
   - **小范围兼容**：做最小修改并补必要测试；
   - **大范围重构**：停止代码修改，只写 Issue。
9. 第一次适配新的 Desktop runtime 时准备统一插件版本：
   - 预发布 DSH `0.2.1-rc.1` → 插件 `0.2.1-rc.1.1`；
   - 稳定 DSH `0.2.1` → 插件 `0.2.1-plugin.1`。
10. 更新 `CHANGELOG.md` 和确有必要的 README / 局部 `AGENTS.md`。
11. 创建/更新兼容 Issue。
12. 创建一次性分支 → `main` PR。合并后删除该分支；不创建或同步长期 `dev`。

## 修改边界

允许：

- 实际使用的 DSH/Cordis direct / peer dependency；
- lockfile；
- import/export、字段、类型、小范围函数签名；
- Hook/Event payload/Service/Slot 的直接适配；
- 必要测试、README、CHANGELOG、局部 `AGENTS.md`。

禁止：

- Desktop 尚未升级时，仅因新 Git tag 就提前升级兼容基线；
- 新功能；
- 无关重构；
- 顺手清理；
- 为通过测试改变主体行为。

## 特别规则：codex-usage

- Codex HTTP 请求头以 **当前 Desktop runtime 对应的 DSH Codex provider 实际实现** 为准；
- Codex 额度 endpoint、method、响应结构和错误处理以当前 pi 生态实际实现为参考；
- 不依赖历史源码行号或机械复制 SSE / Responses 专用头；
- 详细契约以 `packages/codex-usage/AGENTS.md` 为准。

## 完成报告

只需要回答：

- Desktop runtime：哪个版本 → 哪个版本；
- 上游对应：哪个 tag/commit；
- 影响：哪些插件、哪些契约；
- 修改：做了什么最小兼容；
- 验证：哪些命令通过/失败；
- GitHub：Issue / PR。
