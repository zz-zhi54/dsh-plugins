# dsh-init-plugin

> 项目选择、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 社区维护的非官方兼容插件。
>
> **已废弃，兼容保留。** 新项目请使用 `create-agentsmd` skill；本 package 不再新增功能。

为 DeepSeek Harness 提供 Codex 风格的 `/init` 斜杠命令，让 Agent 分析当前仓库并创建或更新仓库根目录的 `AGENTS.md`。

## 何时使用

仅在需要兼容旧配置或旧工作流时单独安装。该插件不包含在 `dsh-plugins` 聚合 Bundle 中。

## 安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/init
```

如果要启用默认的系统通知插件，请改用[根目录 README](../../README.md)中的 Bundle 安装方式，不要同时安装本插件。

## 行为

- `/init` 不接受参数；带参数时返回 usage 错误。
- 无参数时发送普通 user follow-up，让 Agent 分析仓库并创建或更新根目录 `AGENTS.md`。
- Agent 可以读取分析所需的文件，但只能创建或修改仓库根目录的 `AGENTS.md`。
- 已有 `AGENTS.md` 会保留准确且有价值的内容，并清理过时或重复信息。
- 不创建 Goal，也不使用 `goal-round-driver`。
- 命令注册由 Cordis effect 管理；插件卸载后会自动从命令列表移除。

## 验证

查看 Profile 配置：

```sh
dsh --profile web --dump-config
```

单独安装时应看到 `command-init`。启动 Web 后输入 `/`，命令列表中应出现 `/init`。

语法检查：

```sh
pnpm --filter dsh-init-plugin run check
```
