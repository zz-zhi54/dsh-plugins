---
name: dsh-upstream-compatibility
description: 面向 dsh-plugins 的 DSH 官方版本兼容性审计与同步技能。只要用户提到 DSH 官方发布新版本、alpha/beta/rc 更新、升级兼容性、上游 API 变化，或要求确认当前插件是否需要跟进，就使用本技能：查询官方发布信息和上游代码差异，核对当前插件使用的 Service/Event/Slot/依赖契约；有变化时同步源码、测试、manifest、锁文件和文档，并运行验证。不要把“上游已发布”当成只改版本号的理由；必须先有代码或契约证据。需要正式 commit、push、tag、PR 或 GitHub Release 时，再交给 dsh-release-version 技能。
compatibility: 需要 Git、Node.js、pnpm；若要检查实时 DSH Profile，需要当前 DSH 安装和对应的 Inspect Providers；若要查询 GitHub 发布和源码，需要可访问的 GitHub CLI、Web 或上游源码 checkout。
---

# DSH 上游兼容性审计与同步

本技能把“确认 DSH 新版本是否改变了插件契约”和“发布插件版本”分开。先以证据审计上游变化，再做最小同步；不要因为版本号变化就猜测运行时代码需要改动。

## 触发与边界

在仓库根目录执行，适用于：

- DSH 官方发布了新的 `alpha`、`beta`、`rc` 或稳定版本；
- 用户要求检查 DSH 升级后插件是否兼容；
- 用户指出某个 Service、Event、Slot、Web API、ModuleLoader 或依赖发生变化；
- 用户要求把上游版本变化同步到当前 `dsh-plugins`。

本技能默认只负责审计、代码同步和本地验证，不自动提交、推送、打标签、创建 PR 或创建 GitHub Release。用户明确要求发版时，完成本技能后加载并交给 `dsh-release-version`。

## 不可违反的原则

- 不猜上游仓库、标签、服务名、事件名或槽位 props。先从当前项目依赖、已安装 DSH、Git 远端、官方发布页或包元数据中取得证据。
- 不把包版本变更等同于 API 变更。只有上游源码、类型/契约、运行时 Inspect 或可复现测试证明发生变化时，才修改运行时实现。
- 不覆盖、stash、删除或重置用户已有的未提交修改。发现与本次审计无关的 dirty files 时先报告并停止。
- 不修改部署旁边的 shipped preset；只编辑当前 workspace 的插件和项目技能文件。
- 不执行 `git push --force`、`--force-with-lease`、`git reset --hard`，不改写历史，不删除远端分支或发布标签。
- 涉及 Web UI 时保持插件的独立 Slot 注册，不能为了修布局占用或替换 DSH 内置 cell；需要真实运行时契约时先调用 `cordis_inspect_list`，再用精确的 `cordis_inspect_query`。
- 上游信息无法验证、官方标签不存在、或兼容性结论有歧义时停止并请求明确版本/来源，不用猜测填空。

## 执行流程

### 1. 只读预检

先记录：

```sh
git status --short --branch
git branch --show-current
git remote -v
node --version
pnpm --version
```

确认当前目录是 `dsh-plugins` 根目录，分支不是 detached HEAD；将用户已有修改与本次变更分开记录。读取根 `package.json`、`pnpm-workspace.yaml`、所有实际 workspace manifest、`CHANGELOG.md` 和相关 package README，确定当前插件版本、DSH peer/devDependencies、锁文件状态及已声明兼容版本。

如果需要运行时证据，先调用 `cordis_inspect_list`。不要调用未在清单中出现的 Provider 或方法；查询 Service/Event 时先查询紧凑目录，再查询确切服务或事件；查询 UI 时先查询精确 Slot 树和 registration/owner props。

### 2. 识别官方上游版本

优先级如下：

1. 用户给出的官方版本或标签；
2. 当前 manifest/lock 中的 DSH 包和其官方最新发布元数据；
3. 当前 DSH 安装、Git 远端或官方发布页中可以验证的标签。

若用户没有给目标版本，列出当前版本、候选官方标签和选择依据，请用户确认后再改文件。用 `git fetch --tags` 或只读远程查询更新标签引用；不要自动 merge、rebase 或 checkout `main`。

同时记录旧标签、新标签、官方发布说明 URL/来源、以及实际参与比较的上游包。不能访问上游时明确写出阻塞点，不用本地安装版本冒充上游最新源码。

### 3. 建立当前项目契约清单

按实际插件逐项记录：

- Host：`ctx.get(...)` 的 Service key、`ctx.on(...)` 的 Event 名称和模式、Host 路由、依赖注入、使用的 Session/Projection 字段；
- Web：classic-script `window.__ModuleLoader__.load({ id, factory })` 形状、`require('react')`、Slot 名称、注册 ID、order、组件 props 和内联样式假设；
- 配置：Cordis patch 插入的 id/name/config、MCP 配置字段和 package exports；
- 依赖：peer/dev/dependencies、`pnpm-workspace.yaml` 的最低发布年龄放行、`pnpm-lock.yaml` 的实际版本。

对当前项目有影响的 Web Slot 至少核对 `conversation.composer.dock`、`settings.models.footer`；不要把 Inspect Slot 当成可调用业务 Service。

### 4. 对比上游代码和契约

从旧官方标签到新官方标签只看相关差异，优先检查：

- Service/Event 是否重命名、删除、改变注入方式、返回类型、事件 mode 或 payload；
- Session、Projection、credentials、authorization、MCP client、webServer 的公开字段和生命周期；
- Web Slot 的 kind、scope、registration options、owner props、标准 props、渲染方向和可用空间；
- classic client loader、React factory、浏览器 API、HTTP 路由和错误语义；
- 包的 peer dependency 约束、可选依赖、导出路径和官方默认值。

结论必须分为以下之一，并给出证据路径/行号、Inspect 结果或测试结果：

- **无运行时变化**：只需记录兼容性，通常不改源码；
- **metadata-only**：同步 package 版本、直接 DSH 依赖、workspace 放行和 lockfile，必要时更新 README/CHANGELOG；
- **runtime adaptation**：修改受影响插件源码，并同步回归测试、文档和必要的 UI 预览；
- **blocked**：上游来源、契约或运行时状态无法确认，停止修改并提出具体问题。

### 5. 实施最小同步

只有在上一步有证据后才编辑：

- 用确定性的版本同步脚本或明确的 `edit` 更新根和 workspace manifest；
- 用 `pnpm install` 生成必要的 lockfile 变化，不手工重排 lockfile；
- 保持插件独立注册和现有行为，尤其不要替换 DSH 内置 `stats` 或复用既有 Slot ID；
- Web UI 改动遵守 `cordis-plugin-development`：先检查精确 Client Slot，优先安装/验证最小可用插件，再用连接页面观察；
- README 只更新已经由代码/上游差异证明的行为、安装标签、兼容关系和资源；CHANGELOG 从旧标签到当前 diff 起草，不改写历史条目；
- 对每个运行时改动补充可复现的单元/契约测试，优先覆盖旧版本兼容边界和新版本路径。

不要在本技能中顺手发布。用户需要发布时，先展示同步范围和验证结果，再使用 `dsh-release-version` 处理版本修订号、commit、source branch、规范 `v<version>` 标签、PR 和 GitHub Release。

### 6. 验证

至少运行：

```sh
pnpm install
pnpm check
pnpm -r --if-present run test
git diff --check
git status --short
```

若改了 manifest、workspace 或 Cordis patch，必须保留 `pnpm install` 结果并检查 lockfile；若改了 Web client，除语法/测试外尽量检查实际 DSH Web Profile。运行时验证受限时要明确说明“已安装/已注册”与“用户页面可见”之间的差别。

验证完成后审阅：

- 所有 manifest 的目标版本一致；
- DSH 直接依赖、workspace 放行、lockfile 与 README 不再混用旧/新版本；
- 只有本次上游兼容性相关文件发生变化；
- 没有凭据、token、个人配置、生成的临时文件或无证据的 API 改动。

## 输出格式

每次完成后使用以下结构：

```text
上游：<旧官方标签> -> <新官方标签>
结论：<无运行时变化 / metadata-only / runtime adaptation / blocked>
证据：<发布说明、上游文件/差异、Inspect 结果或测试>
同步：<修改的插件、manifest、lockfile、README、CHANGELOG>
验证：<命令 -> 结果>
发布：<未执行；如用户要求则交给 dsh-release-version>
阻塞/下一步：<无，或具体需要用户确认的内容>
```

兼容性结论应让维护者能回答三个问题：上游到底改了什么、当前插件哪些地方受影响、为什么这次修改足够且没有越界。
