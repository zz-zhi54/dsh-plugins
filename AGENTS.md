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

## DSH Desktop 版本兼容

### 版本基线

本仓库的兼容与发布基线是 **DeepSeek Harness Desktop 当前实际内置的 DSH runtime 版本**。

- Desktop runtime 是发布依据；插件的 peerDependencies 必须与该 runtime 对齐。
- 上游 Git tags、Release Notes 和 master 只用于提前观察、审计未来变化，**不能因为出现新 tag 就立即推动插件升级**。
- npm dist-tag、单个 `@deepseek-ai/*` 包版本和第三方信息都不能替代 Desktop runtime 判断。
- 当前目标 runtime 变化时，先确认 Desktop 已实际升级，再开始本仓库的兼容与发布。

### Desktop runtime 升级流程

1. 确认 Desktop 当前实际运行的 DSH runtime 版本已经变化，并记录旧版本 → 新版本。
2. 检查现有 Issue、临时兼容分支和 PR，避免重复处理。
3. 从最新 `main` 创建一次性分支：`compat/desktop-<version>`。
4. 读取该 Desktop runtime 对应的上游源码/workspace 配置，只同步本仓库实际使用的 DSH/Cordis 包。**禁止把全部 `@deepseek-ai/*` 机械替换成同一个版本。**
5. 更新依赖和 lockfile后运行安装、检查和受影响插件测试，观察真实破坏点。
6. 结合对应上游 tag/commit 的 Release Notes 与源码 diff，检查 Service、Event、durable Session event、projection、Authorization、Credentials、Web Server、Client ModuleLoader、Slot、插件生命周期和配置语义。
7. 读取受影响插件的局部 `AGENTS.md`，按其中记录的依赖面和行为契约回到实际源码确认。
8. 只做保持现有插件行为所必需的最小兼容修改，并同步必要测试、README、CHANGELOG 和局部 `AGENTS.md`。
9. 第一次适配新的 Desktop runtime 时统一准备插件版本：预发布 DSH `0.2.0-rc.2` → 插件 `0.2.0-rc.2.1`；稳定 DSH `0.2.0` → 插件 `0.2.0-plugin.1`。
10. 创建/更新对应兼容 Issue，并从该一次性分支创建 PR 直接指向 `main`。
11. PR 合并后删除一次性分支；仓库不再维护长期 `dev` 分支。
12. 如果需要重新设计插件模型、事件体系、生命周期或配置体系，停止代码修改，只保留 Issue 说明 breaking change 和建议方向。

兼容任务禁止：

- 因上游新 Git tag 尚未进入 Desktop 就提前升级发布基线；
- 新功能；
- 无关重构或清理；
- 为了“通过检查”改变插件既有主体行为。

## 插件发布

发布同样以 **Desktop runtime** 为兼容基线，并采用一次性分支，不使用长期 `dev`：

1. 从最新 `main` 创建 `release/<version>`（如果当前兼容分支已经承载本次发布，可直接继续使用该分支）。
2. 确认根与所有 `packages/*/package.json` 使用同一插件版本，且版本前缀对应当前 Desktop runtime。
3. 如果 `v<当前 manifest version>` 尚不存在，直接发布当前版本。
4. 如果该 tag 已存在，说明是在同一 Desktop runtime 基线上再次发布，只递增最后一个插件修订号。
5. 更新 `CHANGELOG.md`；README 只有安装方式、当前版本或兼容关系确实变化时才改。
6. 运行：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
7. 提交 `chore(release): version <version>`。
8. 在该发布提交上创建唯一规范 tag：`v<version>`。
9. 创建临时分支 → `main` PR；合并后删除临时分支。
10. 不需要建立或同步 `dev` 分支。

不要创建 `dsh-plugins-v<version>` 别名 tag。GitHub Release 只有用户明确要求时才创建。

## 维护规则

- 根 `AGENTS.md` 只保留跨插件规则；插件细节下沉到局部 `AGENTS.md`。
- 新增、删除或更换某插件依赖的 DSH API、Service、Event、Hook、Slot 或行为语义时，必须同步更新该插件的 `AGENTS.md`。
- 局部 `AGENTS.md` 记录“依赖面和行为契约”，不要记录容易失效的源码行号和固定历史版本。
- `.agents/skills/dsh-upstream-compatibility` 负责 DSH 新 tag 的兼容流程；`.agents/skills/release-version` 只负责用户明确触发的插件发布，二者不要互相代办。
