---
name: dsh-release-version
description: 发布 dsh-plugins 的 Git 版本。仅在用户明确要求发版时使用。以当前 DeepSeek Harness Desktop 内置 DSH runtime 为兼容基线；从 main 创建一次性 release 分支，完成版本、CHANGELOG、验证和 tag 后直接 PR 回 main，不维护 dev 分支。
compatibility: 需要 Git、Node.js、pnpm 和 GitHub 访问能力；不执行 npm publish。
---

# dsh-plugins 发布

## 边界

- 只有用户明确要求“发布/发版”时使用。
- 兼容基线固定为当前 Desktop 实际内置的 DSH runtime。
- 从最新 `main` 创建一次性 `release/<version>`；如果当前兼容分支已承载本次发布，可直接继续使用。
- PR base 固定为 `main`。
- 不执行 npm publish。
- 不 force push，不移动已有 tag，不改写历史。
- 有与发布无关的未提交修改时停止，不 stash/reset/clean。
- 不创建、同步或依赖长期 `dev` 分支。

## 版本规则

插件版本格式：

`<Desktop DSH runtime version>.<plugin revision>`

例如：

- Desktop DSH `0.2.0-rc.2`
- 插件 `0.2.0-rc.2.1`

### 当前版本还没有 tag

如果 `v<manifest version>` 不存在：

- 直接发布当前 manifest version；
- 不自动 +1。

### 当前版本已经有 tag

如果 `v<manifest version>` 已存在：

- 这是同一 Desktop runtime 基线上的再次发布；
- 只递增最后一个插件 revision；
- 同步根和所有 `packages/*/package.json`。

例如：

`0.2.0-rc.2.1` → `0.2.0-rc.2.2`

不要改变前面的 Desktop DSH runtime 版本部分。

## 发布流程

1. 从最新 `main` 创建一次性发布分支，并确认工作区干净：
   ```sh
   git status --short --branch
   git fetch --tags origin
   ```
2. 运行：
   ```sh
   node .agents/skills/release-version/scripts/next-version.mjs
   ```
3. 如果需要 revision +1：
   ```sh
   node .agents/skills/release-version/scripts/sync-versions.mjs <version>
   ```
4. 确认插件版本前缀与当前 Desktop DSH runtime 完全对应。
5. 更新 `CHANGELOG.md`：
   - 只写实际 diff 能证明的变化；
   - 记录 Desktop runtime；
   - 可附对应上游 tag/commit 作为审计证据；
   - 记录规范插件 tag `v<version>`。
6. README 只有安装版本或兼容关系变化时才更新。
7. 验证：
   ```sh
   pnpm install
   pnpm check
   pnpm -r --if-present run test
   git diff --check
   ```
8. 提交：
   ```text
   chore(release): version <version>
   ```
9. 在发布提交上创建并推送唯一规范 tag：
   ```text
   v<version>
   ```
10. 创建当前一次性分支 → `main` PR。
11. PR 合并后删除一次性分支。

## 标签规则

唯一规范 tag：

`v<version>`

不要创建 `dsh-plugins-v<version>` 别名 tag。已有同名 tag 绝不移动；按版本规则生成下一插件 revision。

GitHub Release 只有用户明确要求时才创建。

## 完成报告

简要报告：

- Desktop DSH runtime；
- 版本：old → published；
- 提交 SHA；
- tag；
- PR；
- 检查结果。
