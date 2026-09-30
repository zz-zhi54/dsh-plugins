---
name: dsh-release-version
description: 发布 dsh-plugins 的 Git 版本。仅在用户明确要求发版时使用。发布源固定为 dev，目标为 main：确定当前 manifest 版本或递增插件修订号，更新 CHANGELOG，验证，提交并推送 dev，在该发布提交上创建 v<version> tag，然后创建 dev -> main PR；绝不自动合并。兼容 DSH 新 tag 不由本技能处理。
compatibility: 需要 Git、Node.js、pnpm 和 GitHub 访问能力；不执行 npm publish。
---

# dsh-plugins 发布

## 边界

- 只有用户明确要求“发布/发版”时使用。
- source 固定为 `dev`，PR base 固定为 `main`。
- 不执行 npm publish。
- 不自动合并 PR。
- 不 force push，不移动已有 tag，不改写历史。
- 有与发布无关的未提交修改时停止，不 stash/reset/clean。
- 兼容 DSH 新版本请使用 `dsh-upstream-compatibility`，本技能不重新做上游兼容分析。

## 版本规则

插件版本格式：

`<DSH version>.<plugin revision>`

例如：

- DSH `0.2.0-rc.2`
- 插件 `0.2.0-rc.2.1`

发布时先读根和所有 `packages/*/package.json`，它们必须使用同一个版本。

### 当前版本还没有 tag

如果 `v<manifest version>` 不存在：

- **直接发布当前 manifest version**；
- 不再自动 +1。

这是新 DSH tag 兼容 PR 已经提前准备好版本号后的正常路径。

### 当前版本已经有 tag

如果 `v<manifest version>` 已存在：

- 这是同一 DSH 基线上的再次发布；
- 只把最后一个插件 revision +1；
- 同步根和所有 `packages/*/package.json`。

例如：

`0.2.0-rc.2.1` → `0.2.0-rc.2.2`

不要改变前面的 DSH 版本部分。

## 发布流程

1. 确认：
   ```sh
   git status --short --branch
   git branch --show-current
   ```
   必须在 `dev`，且没有无关工作区修改。
2. 运行：
   ```sh
   node .agents/skills/release-version/scripts/next-version.mjs
   ```
   脚本输出本次应该“直接发布当前版本”还是“revision +1”。
3. 如果需要 revision +1：
   ```sh
   node .agents/skills/release-version/scripts/sync-versions.mjs <version>
   ```
4. 更新 `CHANGELOG.md`：
   - 只写实际 diff 能证明的变化；
   - 记录对应 DSH tag；
   - 记录规范插件 tag `v<version>`；
   - 不重写历史。
5. README 只有确实存在安装方式、行为、兼容关系变化时才更新；不要为了发版机械修改。
6. 验证：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
7. 提交：
   ```text
   chore(release): version <version>
   ```
8. 推送 `dev`。
9. 在刚才的发布提交上创建并推送：
   ```text
   v<version>
   ```
10. 创建 `dev -> main` PR。
11. 停止。用户人工审核并合并即可；**main 合并后不需要再次运行发布技能**。

## 标签规则

唯一规范 tag：

`v<version>`

不要创建：

`dsh-plugins-v<version>`

如果同名 `v<version>` 已存在，绝不移动它；应按版本规则生成下一插件 revision。

GitHub Release 只有用户明确要求时才创建。

## 发布提交与 PR

发布 commit、远端 `dev` 和 `v<version>` 必须指向同一个发布提交。

PR：

- head：`dev`
- base：`main`
- body 至少列出：
  - plugin version；
  - DSH compatibility tag；
  - release commit；
  - change summary；
  - verification。

不要合并。

## 完成报告

简要报告：

- 版本：old → published；
- 提交 SHA；
- tag；
- PR；
- 检查结果；
- 明确“等待用户人工合并 main”。
