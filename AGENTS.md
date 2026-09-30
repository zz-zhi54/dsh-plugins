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

## DSH 新版本兼容

### 唯一版本源

DSH 版本只认：

`https://github.com/deepseek-ai/deepseek-harness/tags`

不要用 npm dist-tag、单个 `@deepseek-ai/*` 包版本或第三方信息代替 DSH 版本判断。

当前 DSH 仍处于快速发布阶段，alpha、beta、rc、稳定版等所有新 tag 都检查。以后只有用户明确要求，才切换成只处理稳定版。

### 处理一个新 tag

1. 确认该 tag 尚未处理：检查现有 Issue、`compat/dsh-<version>` 分支和 PR，避免重复。
2. 读取该 tag 对应源码中的 workspace/package 配置，确定本仓库实际使用的各个 DSH 子包应该升级到什么版本。**禁止把全部 `@deepseek-ai/*` 机械替换成同一个版本。**
3. 从最新 `dev` 创建 `compat/dsh-<version>`。
4. 先更新本仓库实际使用的 DSH 依赖和 lockfile，再运行安装、检查和受影响插件测试，观察真实破坏点。
5. 同时阅读 Release Notes（如有）并比较前序 tag → 当前 tag 的源码 diff。编译/测试没报错不代表兼容：还要检查 Service、Event、Session event、projection、Authorization、Credentials、Web Server、Client ModuleLoader、Slot、插件生命周期和配置语义。
6. 读取可能受影响插件的局部 `AGENTS.md`，按其中的依赖面和行为契约回到实际源码确认。
7. 只做为兼容新 DSH 所必需的最小修改，并同步必要测试、文档和局部 `AGENTS.md`。
8. 第一次适配新的 DSH tag 时，将根和所有插件 manifest 的版本统一为 `<DSH tag 去掉 dsh-v>.1`。这只是准备插件版本，**此阶段不创建发布 tag**。
9. 创建/更新一个该 DSH 版本的兼容 Issue。
10. 小范围兼容：创建 Draft PR 指向 `dev`，然后停止，等待用户审核。
11. 如果需要重新设计插件模型、事件体系、生命周期、配置体系，或出现明显的大范围重构，只保留 Issue，写清 breaking change、受影响位置和建议方向；不要自动实现，也不要创建重构 PR。

兼容任务禁止：

- 自动合并；
- 创建插件发布 tag 或 GitHub Release；
- 新功能；
- 无关重构或清理；
- 为了“通过检查”改变插件既有主体行为。

## 插件发布

“兼容 DSH”与“发布 dsh-plugins”是两件事。只有用户明确要求发版时才执行发布流程。

发布源固定为 `dev`，目标固定为 `main`：

1. 确认工作区干净、`dev` 包含准备发布的改动，并且根与所有 `packages/*/package.json` 版本一致。
2. 如果 `v<当前 manifest version>` 尚不存在，直接发布当前版本；这是新 DSH tag 兼容完成后的常见情况。
3. 如果 `v<当前 manifest version>` 已存在，说明是在同一个 DSH 兼容基线上再次发布插件修订版，只递增最后一个插件修订号，并同步根和所有插件 manifest。
4. 更新 `CHANGELOG.md`；README 只有确实存在用户可见变化时才改，不为了发版机械改文档。
5. 运行：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
6. 提交 `chore(release): version <version>` 并推送 `dev`。
7. 在这个发布提交上创建并推送唯一规范 tag：`v<version>`。
8. 创建 `dev -> main` PR，交给用户人工审核和合并。
9. 到此结束。**不自动合并 PR，也不需要等 main 合并后再跑一次发布流程。**

不要创建 `dsh-plugins-v<version>` 别名 tag。GitHub Release 只有用户明确要求时才创建。

## 维护规则

- 根 `AGENTS.md` 只保留跨插件规则；插件细节下沉到局部 `AGENTS.md`。
- 新增、删除或更换某插件依赖的 DSH API、Service、Event、Hook、Slot 或行为语义时，必须同步更新该插件的 `AGENTS.md`。
- 局部 `AGENTS.md` 记录“依赖面和行为契约”，不要记录容易失效的源码行号和固定历史版本。
- `.agents/skills/dsh-upstream-compatibility` 负责 DSH 新 tag 的兼容流程；`.agents/skills/release-version` 只负责用户明确触发的插件发布，二者不要互相代办。
