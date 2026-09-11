# dsh-plugin-manager

> 项目总览、统一安装入口和仓库结构见[根目录 README](../../README.md)。
>
> 非官方社区插件。

为 DeepSeek Harness Web Profile 的设置页面增加一个轻量插件管理页。它只管理固定的 Web Profile，并把安装、更新和删除继续交给 DSH 自己的 Plugin CLI。

## 功能

在 **设置 → 插件 → 插件管理** 中可以：

- 查看 Web Profile 中已安装的 DSH bundle 插件、版本、来源和当前 spec；
- 输入完整 plugin spec，执行与 `dsh plugin --profile web add <spec>` 等价的安装或更新；
- 删除插件，执行与 `dsh plugin --profile web remove <package-name>` 等价的操作；
- 查看执行中的状态，以及经过脱敏的 DSH CLI stdout / stderr 诊断信息。

插件名称和 spec 会作为独立 argv 参数交给 DSH CLI，插件管理器不提供通用 Shell 或额外 profile 参数。页面返回的 spec 和 CLI 诊断会先脱敏；含凭据的 spec 需要在更新时重新输入。CLI 失败时不会自动修改 pnpm、allowBuilds、package.json 或其它用户配置。

插件管理器自身会显示为“当前正在使用”，删除按钮会被禁用，避免从正在使用的页面卸载自身。

## 安装

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/plugin-manager'
```

固定 release 时，将路径替换为 `#v<version>&path:packages/plugin-manager`。

## 开发与验证

前端源码使用 TypeScript 和 DSH 官方客户端类型；`src/client.ts` 通过 `ctx.slots.inject()` 注册 Settings tab，构建时才生成 DSH Web 所需的 `dist/client.js` classic-script 模块。`window.__ModuleLoader__.load()` 是运行时产物的加载协议，不是业务 UI 的写法。

```sh
pnpm --filter dsh-plugin-manager run check
pnpm --filter dsh-plugin-manager run test
```

本插件使用 DSH 已有的 authenticated Connection RPC 与 `subprocess` capability，不重新实现插件生命周期或包管理逻辑。
