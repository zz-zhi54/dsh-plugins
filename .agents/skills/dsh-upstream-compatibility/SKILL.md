---
name: dsh-upstream-compatibility
description: DeepSeek Harness 官方发布新的 RC 或稳定版后，及时同步 dsh-plugins 的兼容性。以正式发布的 DSH tag 为基线，不等待 Desktop；从 main 创建一次性兼容分支并直接 PR 回 main，不维护 dev 分支。
compatibility: 需要 Git、Node.js、pnpm 和 GitHub 访问能力；运行时验证需要对应版本的 DSH。
---

# DSH 上游版本兼容

## 目标与版本源

**上游正式发布新的 DSH RC 或稳定版后，就开始兼容升级**；不再把 Desktop 内置版本作为前置门槛。

- 使用 `deepseek-ai/deepseek-harness` 正式 Release 对应的 `dsh-v<version>` tag、源码及实际包清单为依据。
- 优先适配最新已发布的 RC 或稳定版，未发布的 master 提交仅供观察，不能替代 tag。
- npm dist-tag 可以帮助核对包是否可安装，单个 npm 包版本不单独决定 DSH 目标版本。
- 依赖应以该 tag 的 workspace package manifests 中每个包的实际版本为准；**禁止把 `@deepseek-ai/*` 全部机械替换为同一版本**。

## 流程

1. 确认官方发布的新 DSH tag 与版本，记录旧版本 → 新版本。
2. 搜索现有兼容 Issue、临时分支和 PR，避免重复；从最新 `main` 创建 `compat/dsh-<version>`，已有同目标 PR 则继续使用原分支。
3. 读取新 tag 的 workspace/package 配置，仅调整插件实际使用的 DSH/Cordis/模型价格目录等依赖版本，核对 peerDependencies 和相应的 package exports。
4. 重新安装，**真实生成**锁文件，不能靠替换版本字符串伪造 `pnpm-lock.yaml`：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
5. 阅读 Release Notes 并比较相关源码 diff，重点检查：
   - package exports / import paths；
   - Host Service、Cordis Event、durable Session event、Session Projection；
   - Authorization / Credentials、Web Server；
   - Client ModuleLoader、Web Slot、插件元信息及安装方式；
   - plugin lifecycle / HMR、config schema、`engines.dsh` 等兼容声明。
6. 读取受影响插件的 `AGENTS.md`，按实际代码验证依赖面和行为契约。
7. 分类：
   - **无运行时破坏**：只同步依赖、lockfile、插件版本和确有必要的文档；
   - **小范围破坏**：最小改动并补必要测试；
   - **大范围重新设计**：停止代码修改，记录 breaking change 与方向。
8. 同步根与所有插件的统一版本：预发布 DSH `0.2.1-rc.2` 首次对应插件 `0.2.1-rc.2.1`；稳定版 `0.2.1` 首次对应 `0.2.1-plugin.1`。
9. 更新 `CHANGELOG.md` 和需要变化的 README、局部 `AGENTS.md`，创建/更新兼容 Issue。
10. 一次性分支 PR 直接指向 `main`，不自动合并，不维护 `dev`。

兼容升级不自动创建 tag 或 GitHub Release，发布动作仍依照 `release-version` Skill 且需要用户明确要求发版。

## 修改边界

允许：实际使用的 direct/peer/dev dependency、lockfile、import/export、字段、类型、必要的兼容代码和测试、README、CHANGELOG、对应 `AGENTS.md`。

禁止：无关新功能、顺手重构、机械统一依赖版本、伪造锁文件、为通过测试改变原有主体行为。

## codex-usage 特别规则

- HTTP 头以 **当前目标 DSH tag 的 Codex provider 实际实现** 为准；
- 用量 endpoint、method、响应结构和错误处理参考当前 pi 生态实际实现；
- 不机械复制模型 SSE/Responses 专用头；不能泄漏凭据或原始额度响应；
- 具体行为与安全契约遵循 `packages/codex-usage/AGENTS.md`。

## 完成报告

只需要回答：目标 DSH 发布版本/tag、受影响插件与契约、最小修改、验证通过或失败、GitHub PR。
