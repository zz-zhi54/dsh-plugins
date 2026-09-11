---
name: dsh-release-version
description: 为当前 dsh-plugins pnpm monorepo 执行受控的 GitHub 发布准备与发布流程。只要用户提到发版、版本号、release、CHANGELOG、打标签、推送 dev/其他分支、创建到 main 的 PR，或要求检查发布文档，就使用本技能；即使用户没有明确说“release”，但任务涉及同步 package 版本并将变更送入 main，也要使用它。技能会从当前检出的非 main 分支计算下一个插件修订号，同步根目录与实际 workspace package/组合目录，检查 README/兼容关系/CHANGELOG，运行 pnpm 验证，在一次最终确认后 commit、push、打并推送标签、创建 source→main PR；绝不自动合并、改写历史或强制推送。
compatibility: 需要 Git、Node.js、pnpm、GitHub CLI（gh）及已配置的 GitHub 认证；只支持 Git 发布，不执行 npm publish。
---

# dsh-plugins 发布技能

本技能把“发布代码”和“合并到 main”分开：当前分支是发布源，发布提交先推送到远端并打标签，再创建指向 `main` 的 PR；PR 必须由用户手工合并。这样发布标签不会依赖 main 的合并权限，也不会让自动化越权合并受保护分支。

## 适用范围与不可违反的边界

- 在仓库根目录执行；只处理当前仓库的 Git 发布，不执行 npm registry 发布。
- 发布源是当前检出的分支；拒绝 detached HEAD 和 `main`。如果当前分支是 `dev`，就按 `dev -> main` 执行；其他非 `main` 分支也可以发布，但必须在报告中明确 source branch。
- `main` 只能作为 PR base，不能 checkout 后直接提交、push、merge，也不能调用 `gh pr merge`。
- 绝不使用 `git push --force`、`--force-with-lease`、`git reset --hard` 或任何改写历史的操作。
- 发现用户已有未提交修改、未跟踪文件或冲突时立即停止；不得 stash、覆盖、删除或替用户判断这些修改。
- 任何远程动作失败都要保留现场并报告已完成的动作、未完成的动作和安全的恢复命令；不要为了“继续流程”猜测或强行重试。
- 当前仓库的版本约定是 `DSH 版本.插件修订号`，例如 `0.1.5-rc.1.6`。不要把 CHANGELOG 中的历史版本重新排序或改写。

## 执行流程

### 1. 预检（只读）

先记录并展示以下信息，再做任何本地修改：

```sh
git status --short --branch
git branch --show-current
git remote -v
node --version
pnpm --version
gh auth status
```

然后确认：

1. 当前目录是仓库根目录，当前分支存在且不是 `main`，工作区和 index 都干净。
2. `origin` 存在且是 GitHub 仓库；读取 owner/repository，不要从用户输入臆造远端。
3. `gh auth status` 成功，并且当前账号有创建 PR 的权限。认证失败时在预检阶段停止，不修改版本、文档或 CHANGELOG，也不执行后续检查；先让用户完成认证后重新运行，避免生成无法完成发布的半成品。
4. 本地已有的发布提交、标签和远端分支状态已记录。允许当前源分支落后或领先远端，但必须在最终报告中说明 ahead/behind 数量。
5. 用 `git fetch --tags origin` 只更新远端标签引用；不要 fetch 后自动 merge、rebase 或 reset。

### 2. 计算下一个版本

优先使用随技能提供的只读脚本：

```sh
node .agents/skills/release-version/scripts/next-version.mjs
```

脚本会从 `dsh-plugins-v*` 标签中找最新版本，并把末尾插件修订号加一。例如：

- `dsh-plugins-v0.1.5-rc.1.6` → `0.1.5-rc.1.7`
- `dsh-plugins-v0.1.5-alpha.2.2` → `0.1.5-alpha.2.3`

必须满足以下条件，否则停止并请求用户明确指定版本：

- 存在可识别的最新发布标签；
- 标签版本符合 `X.Y.Z-通道.通道号.插件修订号` 约定；
- 计算出的 `dsh-plugins-v<version>` 在本地和远端都不存在；
- 根 `package.json` 与实际 workspace 中的 package manifest 当前版本一致。当前 `dev` 约定是 `packages/*` 与 `packs/*`；如果当前分支存在 `bundles/*` 或其他 workspace 组合目录，也必须纳入发现结果。缺少 `version` 或版本不一致时不要静默修复，先报告路径和现值。

输出版本计划，包含：旧标签、目标版本、目标标签、source branch、PR base、将要更新的 manifest 路径。版本号建议必须在修改文件前让用户知晓；最终远程动作仍只在一次总确认后进行。

### 3. 生成本地发布变更

使用确定性的同步脚本更新所有参与发布的 manifest：

```sh
node .agents/skills/release-version/scripts/sync-versions.mjs <version>
```

脚本只能修改 manifest 的 `version` 字段，不得重排依赖、改变脚本或改动锁文件以外的无关内容。随后检查以下文档并按实际变更更新：

- 根目录 `CHANGELOG.md`：把 `Unreleased` 中已经完成的条目整理为 `## <version> — YYYY-MM-DD`，保留对应 DSH 官方标签和本仓库标签；为后续工作留下空的 `## Unreleased` 区块。
- 根目录 README 以及实际存在的 `packages/*/README.md`、`packs/*/README.md`、`bundles/*/README.md`：逐一核对安装命令、项目关系、截图/资源、限制、兼容关系和 hard-coded 版本。根 README 当前不固定具体插件版本，不要为了发版给它添加版本号。
- 只更新与本次变更实际相关的用户可见行为、兼容关系和安装说明；没有需要修改的 README 也要在发布摘要中说明核对结果和不修改的理由，不要把历史版本信息复制到 README。
- DSH 兼容关系：从 package 的 peer/dev dependencies、既有 CHANGELOG 和变更内容核对官方 DSH 标签。若本次没有改变兼容版本，沿用上一版本并明确写出；若无法确定，停止并请求确认，不要猜测。

CHANGELOG 条目应从上一个发布标签到当前 HEAD 的实际提交和 diff 起草：

```sh
git log --format='%h %s' <previous-tag>..HEAD
git diff --stat <previous-tag>..HEAD
git diff --name-status <previous-tag>..HEAD
```

只写可以由 diff 证实的用户可见变化，按“新增 / 修复 / 兼容性 / 文档”等小节归类；不要编造性能数字、测试结果或未实现的功能。日期使用当前日期。把草稿和待确认问题展示给用户。

### 4. 安装、检查和文档审阅

本地变更完成后，在仓库根目录运行：

```sh
pnpm install
pnpm check
pnpm -r --if-present run test
```

如果某个命令失败，停止发布动作，记录完整失败命令和关键错误，并优先修复根因。对于没有 `test` 脚本的包，递归命令应跳过；对受影响插件仍需确认其 `check`/`test` 已执行。不要把失败标记成成功，也不要用跳过测试来“绿化”发布。

检查结束后再次运行：

```sh
git diff --check
git status --short
git diff --stat
git diff -- CHANGELOG.md package.json packages/*/package.json packs/*/package.json
```

审阅清单：

- 所有根、插件和组合 manifest 的版本都等于目标版本；
- `pnpm-lock.yaml` 只包含安装产生的必要变化；如果安装没有需要更新的内容，不要手工改锁文件；
- CHANGELOG 有目标版本、日期、对应 DSH 标签和仓库标签，且 Unreleased 结构清楚；
- README 的安装方式、插件组合关系、兼容性、资源 `files` 和当前行为与代码一致；
- 没有凭据、token、个人配置或与发布无关的改动；
- 工作区中的新技能文件如果是本次任务的一部分，应单独列出，不要误并入产品版本发布提交。

### 5. 唯一的最终确认闸门

在 `commit`、任何 `push`、创建标签或创建 PR 之前，输出一份发布摘要并只询问一次确认。摘要至少包含：

- source branch、base branch（固定为 `main`）、origin；
- old version/tag、new version/tag；
- 将提交的文件和 CHANGELOG 草稿；
- `pnpm install`、`pnpm check`、测试、`git diff --check` 的结果；
- 预计 commit subject、PR 标题和 PR body；
- 明确说明：会推送 source branch、创建并推送标签、创建 PR，但**不会合并 PR**。

用户拒绝时不要执行任何远程动作；保留本地修改并等待用户编辑或明确要求撤销。用户确认后不得悄悄扩大文件范围；如果确认后发现文件变更或测试结果改变，回到确认闸门重新确认。

### 6. 提交、推送、打标签和创建 PR

确认后严格按顺序执行：

1. 重新确认工作区仍只包含发布相关变更，并提交：

   ```sh
   git add <明确列出的发布文件>
   git commit -m "chore(release): version <version>" \
     -m "Packages: <受影响 package 列表>" \
     -m "Checks: pnpm install; pnpm check; pnpm -r --if-present run test"
   ```

   如果用户要求把技能文件纳入同一提交，单独列出；否则不要把技能开发文件混入产品 release commit。

2. 先推送当前源分支，不能用 force：

   ```sh
   git push origin <source-branch>
   ```

   分支推送失败时停止，暂不创建标签和 PR。

3. 确认 HEAD 是刚才的 release commit 且远端分支已包含该提交，然后创建并推送带说明的标签：

   ```sh
   git tag -a dsh-plugins-v<version> -m "dsh-plugins v<version>"
   git push origin dsh-plugins-v<version>
   ```

   创建标签前再次确认本地和远端不存在同名标签。禁止移动已有标签；如果标签推送失败，保留本地标签并报告，不创建 PR，等待用户处理。

4. 检查是否已有 source→main 的开放 PR。没有时使用 GitHub CLI 创建：

   ```sh
   gh pr create \
     --base main \
     --head <source-branch> \
     --title "chore(release): version <version>" \
     --body-file <临时 PR body 文件>
   ```

   PR body 应包含版本、标签、变更摘要、验证命令、release commit SHA，并写明“请人工审核并合并；本技能不会自动合并”。若已有开放 PR，不创建重复 PR，直接报告现有 PR URL。

5. 最终验证并报告：

   ```sh
   git status --short --branch
git show -s --format='%H %s' HEAD
git ls-remote origin refs/heads/<source-branch> refs/tags/dsh-plugins-v<version>
gh pr view <pr-number> --json number,url,state,baseRefName,headRefName
   ```

   成功标准是工作区干净、source branch 和标签指向同一个 release commit、PR 的 head 是 source branch、base 是 `main`。在 PR 合并前不要声称 `main` 已包含 release commit，也不要要求或执行快进合并。

## 输出格式

完成后用以下结构简要报告：

```text
发布结果：<已创建 PR / 已完成本地准备 / 已停止>
版本：<old> -> <new>
源分支：<source>；目标分支：main
提交：<sha>
标签：<tag>（<远端状态>）
PR：<url 或未创建原因>
检查：<命令 -> 结果>
工作区：<clean / 保留本地修改>
下一步：<用户需要手工审核并合并 PR，或具体恢复动作>
```

## 常见停止条件

- 在 `main`、detached HEAD 或有未提交改动：只做说明，不修改、不推送。
- 无法识别最新标签或版本不一致：请求明确版本/修复 manifest，不猜版本。
- CHANGELOG 无法从 diff 证明 DSH 兼容性：请求确认，不捏造兼容关系。
- `pnpm install`、`pnpm check` 或测试失败：停在本地，报告失败，不 commit/push/tag/PR。
- `gh` 未安装、未认证或远端不是 GitHub：停在最终确认前；可以保留本地发布变更，但不要伪造 PR URL。
- 已存在同名标签、release commit 不在 source branch、已有冲突 PR 或远端状态与预期不一致：停止并报告，不删除或移动标签，不强推。

## 随附脚本

- `scripts/next-version.mjs`：只读计算最新标签和下一个插件修订号，同时核对 workspace manifest 版本。
- `scripts/sync-versions.mjs`：只修改根以及 `packages/*`、`packs/*`、`bundles/*` 中已发现 manifest 的 `version` 字段；不会执行 Git 操作。
