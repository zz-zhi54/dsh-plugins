---
name: dsh-upstream-compatibility
description: 检查并同步 dsh-plugins 对 DeepSeek Harness 新 Git tag 的兼容性。以 deepseek-ai/deepseek-harness 的 GitHub Tags 为唯一版本源；先升级真实使用的 DSH 依赖，再结合 Release Notes、tag diff、插件 AGENTS.md 和实际失败点判断影响。小范围兼容创建 Issue + Draft PR 到 dev；需要大范围重构时只创建 Issue 并停止。绝不自动合并或发布。
compatibility: 需要 Git、Node.js、pnpm 和 GitHub 访问能力；运行时验证需要可用的 DSH 环境。
---

# DSH 上游兼容

## 目标

处理一个尚未兼容的新 DSH tag，并且只做保持现有插件行为所必需的修改。

## 版本源

唯一版本源：

`https://github.com/deepseek-ai/deepseek-harness/tags`

当前快速发布阶段检查所有 tag，包括 alpha、beta、rc 和稳定版。不要使用 npm dist-tag 判断 DSH 是否发布新版本。

## 流程

1. 确认目标 tag 尚未处理：
   - 搜索现有兼容 Issue；
   - 搜索 `compat/dsh-<version>`；
   - 搜索已有 PR。
2. 找到直接前序 DSH tag，并记录前序 → 当前 tag。
3. 从最新 `dev` 创建 `compat/dsh-<version>`。
4. 读取当前 tag 源码中的 workspace/package 配置，只升级本仓库实际使用的 DSH 包到它们各自的真实版本。
   - 禁止把全部 `@deepseek-ai/*` 统一替换成同一个版本。
5. 运行：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   ```
   先看依赖升级后真实暴露的问题。
6. 阅读 Release Notes（如有），并比较前序 tag → 当前 tag 的源码 diff。重点检查：
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
7. 读取受影响插件目录下的 `AGENTS.md`。局部文件记录的是该插件依赖的 DSH surface 和行为契约；必须按契约回到实际源码确认。
8. 分类：
   - **无需运行时修改**：依赖/lockfile/版本准备和必要文档即可；
   - **小范围兼容**：直接做最小修改并补必要测试；
   - **大范围重构**：停止代码修改，只写 Issue。
9. 第一次适配一个新的 DSH tag 时，把根和所有插件 manifest 版本统一为：
   `<DSH tag 去掉 dsh-v>.1`
   例如 `dsh-v0.2.1-rc.1` → `0.2.1-rc.1.1`。
   此处只是准备插件版本，不创建发布 tag。
10. 创建/更新版本对应 Issue，记录：
    - 上游 tag；
    - 前序 tag；
    - Release Notes / diff 证据；
    - 受影响插件；
    - 修改范围；
    - 验证结果或阻塞。
11. 若是小范围兼容，创建 Draft PR：
    - head：`compat/dsh-<version>`
    - base：`dev`
    - 不合并。
12. 若需要重新设计插件模型、事件体系、生命周期、配置体系或跨多个模块的大重构：
    - Issue 写清 breaking change 和建议方向；
    - 不创建代码 PR。

## 修改边界

允许：

- DSH 直接依赖 / peer dependency；
- lockfile；
- import/export、字段、类型、小范围函数签名；
- Hook/Event payload/Service/Slot 的直接适配；
- 必要测试、README、CHANGELOG、局部 `AGENTS.md`。

禁止：

- 新功能；
- 无关重构；
- 顺手清理；
- 为通过测试改变主体行为；
- 自动合并；
- 创建插件 release tag / GitHub Release。

## 特别规则：codex-usage

处理 `packages/codex-usage` 时：

- Codex HTTP 请求头以**当前 DSH Codex provider 实际实现**为准，检查当前的 `buildBaseCodexHeaders()` 或等价实现；
- Codex 额度查询的 endpoint、method、响应结构和错误处理以**当前 pi 生态实际查询额度的插件实现**为准；
- 不依赖历史版本号、固定源码行号或过去的 header 列表；
- 不机械复制模型 SSE / Responses 专用头；
- 详细契约以 `packages/codex-usage/AGENTS.md` 为准。

## 完成条件

最终报告只需要回答：

- 上游：哪个 tag → 哪个 tag；
- 影响：哪些插件、哪些契约；
- 修改：做了什么最小兼容；
- 验证：哪些命令通过/失败；
- GitHub：Issue / Draft PR；
- 大范围变化时说明为什么停在 Issue。
