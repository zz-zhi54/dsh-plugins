# DSH `0.2.2-rc.1` 兼容同步

## 基线与范围

- 旧基线：[`dsh-v0.2.1-rc.2`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2)，commit `687f282e8625c6b8d11ff58211a90524be2e4317`。
- 新基线：[`dsh-v0.2.2-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1)，commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`，官方于 2026-11-04 发布。
- 插件版本：`0.2.1-rc.2.1 → 0.2.2-rc.1.1`。
- 维护者的个人使用流程已转到 Magpie，原先三个插件对应的需求已得到满足，因此停止维护并删除 `codex-login`、`codex-usage`、`session-cost` 的源码、测试、截图、manifest 和 Profile patch；只维护 `system-notification`。
- 检查远端 main、现有分支及开放的 Issue/PR 后，从最新 main 创建 `compat/dsh-0.2.2-rc.1`；没有已有的同目标兼容 PR。

## 实际依赖

| 包 | 旧版本 | 目标 tag 的实际版本 |
| --- | --- | --- |
| `@deepseek-ai/dsh-session` | `0.2.1-rc.2` | `0.2.2-rc.1` |
| `@deepseek-ai/cordis` | `4.0.5` | `4.1.0` |
| `@deepseek-ai/cosmokit`（间接依赖） | `1.8.6` | `1.9.0` |
| `@deepseek-ai/schemastery`（间接依赖） | `3.18.5` | `3.19.0` |

- 直接依赖版本取自官方 tag 的 [Session manifest](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/core/session/package.json) 和 [Cordis manifest](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/vendor/cordis/package.json)，没有统一替换所有 `@deepseek-ai/*` 版本。
- 通知插件的 peerDependencies、devDependencies 与 `engines.dsh` 同步；插件没有额外的生产 dependencies。
- 官方 [CLI manifest](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/apps/cli/package.json) 将 Node.js 最低版本设为 `>=24.9.0`，安装文档同步提示。
- 运行 `pnpm install` 实际重建锁文件，移除旧插件 importer 和不再需要的依赖；最终依赖记录由 190 项缩减到 13 项。
- 发布年龄放行仅保留当前依赖闭包的精确版本，移除旧插件专用的 Authorization、Credentials、Session Projection 以及 pi-ai 构建脚本配置。

## 通知契约核对

| 契约 | 官方 tag 源码与结论 |
| --- | --- |
| `ctx.on('session/event', listener)` | [Session 源码](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/core/session/src/index.ts) 的参数仍为 `(session, event)`。事件先提交到 Session log，再通知监听器；不等同于磁盘 flush 已完成。 |
| 完成判断 | [Session types](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/core/session/src/types.ts) 保留 `turn/end` 的 `reason.kind === 'completed'`，其他结束原因不通知完成。 |
| 审批通知 | [User Approval types](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/interaction/user-approval/src/types.ts) 保留 `approval/asked` 审计事件；[审批实现](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/interaction/user-approval/src/index.ts) 在调用 answerer 前追加该事件。插件继续按 Session + seq 去重。 |
| 稳定 seq | Session append 按日志位置分配 `seq`，通知拿到已提交的事件；无需引入新的持久状态。 |
| 监听器生命周期 | [Cordis EventsService](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/vendor/cordis/src/events.ts) 仍通过所属 fiber effect 注册和释放监听器；现有 Host 无需迁移。 |
| 插件入口 | 保留 ESM `apply(ctx)`、package exports、`dsh.bundle.patch` 与原有组件 ID，无配置 schema 或客户端 Slot。 |

通知运行时代码保持不变；同步局部契约文档、中英文安装说明、索引安装入口和 CHANGELOG。旧插件的历史记录保留，README 提供已安装旧插件的卸载命令。

## 验证及限制

已在本地执行并通过：

```sh
pnpm install
pnpm install --frozen-lockfile
pnpm check
pnpm -r --if-present run test
git diff --check
```

- 现有 9 项通知测试全部通过，涵盖平台命令构造、Windows 路径转义、非完成原因过滤、逐轮完成通知及审批事件去重。
- 使用安装后的真实 `@deepseek-ai/dsh-session@0.2.2-rc.1` 和 `@deepseek-ai/cordis@4.1.0` 做进程内冒烟验证：创建 Session、追加审批与完成事件、重复派发审批事件、卸载 observer 后追加事件，以及实际 Host 插件加载/卸载，全部通过。通知接收端使用内存 recorder。
- 未修改运行中的 DSH Profile，也未在 macOS / Windows 桌面上手动确认系统通知的实际显示。

## 发布

- 发布版本 `0.2.2-rc.1.1`，规范 tag 为 [`v0.2.2-rc.1.1`](https://github.com/zz-zhi54/dsh-plugins/releases/tag/v0.2.2-rc.1.1)，发布分支 `release/0.2.2-rc.1.1` 的 PR 指向 main。
- 原工作区有与本次发布无关的暂存删除，发布在独立 worktree 中进行，不将该删除纳入发布提交。
- 依赖 PR #30、#33、#34、#35、#36、#38 的目标包已不在剩余插件依赖闭包中；#37 修改已删除插件的直接 Zod dependency。均关闭为不再适用，DSH 的间接 Zod 精确版本保持不变。
- GitHub Release 按用户明确发布请求创建为 prerelease，不执行 npm publish。
