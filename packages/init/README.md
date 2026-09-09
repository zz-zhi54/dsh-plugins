# dsh-init-plugin

为 DeepSeek Harness 提供 Codex 风格的 `/init` 斜杠命令，让当前 Agent 分析仓库并创建或更新项目根目录的 `AGENTS.md`。

## 安装

在 Monorepo 根目录执行：

```sh
dsh plugin --profile web add ./packages/init
```

如果希望同时启用本仓库的全部插件，使用根目录文档中的 `bundles/dsh-plugins`，不要再重复单独安装本插件。

## 行为

- `/init` 无参数时发送普通用户 prompt，让 Agent 分析仓库。
- Agent 只能创建或修改仓库根目录的 `AGENTS.md`，其他文件只读。
- 已有 `AGENTS.md` 会先读取并按准确性、价值与维护成本进行更新。
- `/init` 带参数时返回 usage 错误。
- 命令注册由 Cordis effect 管理，插件卸载后自动从命令列表移除。
- 不创建 Goal，也不使用 `goal-round-driver`。

## 验证

```sh
dsh --profile web --dump-config
```

应能看到 `command-init`。

启动 Web 后输入 `/`，命令列表应出现 `/init`。
