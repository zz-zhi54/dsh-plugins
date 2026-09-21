# dsh-plugins

[中文](README.md)

A personally maintained collection of DeepSeek Harness (DSH) plugins, organized as a pnpm workspace monorepo. Independently installable plugins live under `packages/*`.

> This is an unofficial community project maintained independently of DeepSeek AI and the official DeepSeek Harness team.
>
> This README is the English project entry point. It covers plugin selection, installation, and repository structure. Each package README contains the package's detailed behavior and limitations. For the current versions, DSH compatibility, and release history, see [`CHANGELOG.md`](CHANGELOG.md) and the individual `package.json` files.

## Plugin overview

The current compatibility target is DSH `v0.1.6-alpha.2`; no breaking DSH contract changes were found, and `session-cost` now uses the new projection seam instead of deprecated Session snapshot reads.

| Package | Type | Package name | Purpose | Details |
| --- | --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | On-demand plugin | `dsh-system-notification-plugin` | Watches task and approval events and sends native macOS / Windows notifications | [`README`](packages/system-notification/README.md) |
| [`packages/codex-login`](packages/codex-login/) | Temporary on-demand plugin | `dsh-codex-login-plugin` | Provides the ChatGPT / Codex OAuth login entry point; uninstall it after the first successful login | [`README`](packages/codex-login/README.md) |
| [`packages/codex-usage`](packages/codex-usage/) | On-demand plugin | `dsh-codex-usage-plugin` | Shows Codex 5-hour and weekly quota usage with reset countdowns below the composer | [`README`](packages/codex-usage/README.md) |
| [`packages/session-cost`](packages/session-cost/) | On-demand plugin | `dsh-session-cost-plugin` | Shows provider/model session costs and USD totals below the token statistics row | [`README`](packages/session-cost/README.md) |
| [`packages/project-mcp`](packages/project-mcp/) | On-demand plugin | `dsh-project-mcp-plugin` | Loads isolated project-scoped MCP servers from each project's `.dsh/mcp.yml` | [`README`](packages/project-mcp/README.md) |

### How the plugins relate

- Each plugin can be installed, updated, and uninstalled independently. Combination packs are no longer maintained.
- The Codex usage plugin reads the same `llm-pi-ai/openai-codex` credential as DSH. It never writes credentials or refreshes tokens itself.
- The Codex login plugin is only needed for the initial login and can be removed after the login succeeds.

## Design principles

- **Minimal dependencies and code:** use only what each feature needs and prefer services and extension points already provided by DSH.
- **Focused and stable:** provide small, clearly scoped capabilities for practical use cases instead of covering every scenario.
- **Minimal intrusion:** connect through independent Profile layers without modifying DSH core or taking over the Agent loop, approval flow, or other primary flows.
- **Open collaboration:** issues and pull requests for problems, suggestions, documentation, tests, and implementations are welcome.
- **Stability first:** preserve existing behavior and public contracts; failures in side-channel features such as notifications must not affect the DSH main flow.
- **Upstream first and removable:** when DSH provides an equivalent official capability, the corresponding plugin will be deprecated and removed instead of being kept as a duplicate implementation.

## Installation, removal, and updates

Each plugin is installed independently from a `packages/*` subdirectory on GitHub. You do not need to clone this repository, enter it, or preinstall other plugins.

### Install

The current workspace contains five independently installable plugins. The version examples below come from their respective `package.json` files:

| Package directory | Package name | Example version | Purpose |
| --- | --- | --- | --- |
| `packages/system-notification` | `dsh-system-notification-plugin` | `0.1.6-alpha.2.4` | Native macOS / Windows notifications |
| `packages/codex-login` | `dsh-codex-login-plugin` | `0.1.6-alpha.2.4` | Initial ChatGPT / Codex login |
| `packages/codex-usage` | `dsh-codex-usage-plugin` | `0.1.6-alpha.2.4` | Codex quota display |
| `packages/session-cost` | `dsh-session-cost-plugin` | `0.1.6-alpha.2.4` | Session cost display |
| `packages/project-mcp` | `dsh-project-mcp-plugin` | `0.1.6-alpha.2.4` | Project-scoped MCP isolation |

Install an individual plugin from the current default branch:

```sh
# System notifications
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/system-notification'

# Codex login
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/codex-login'

# Codex usage
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/codex-usage'

# Session cost
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/session-cost'

# Project-scoped MCP
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#path:packages/project-mcp'
```

You can also install all plugins at once:

```sh
dsh plugin --profile web add \
  'github:zz-zhi54/dsh-plugins#path:packages/system-notification' \
  'github:zz-zhi54/dsh-plugins#path:packages/codex-login' \
  'github:zz-zhi54/dsh-plugins#path:packages/codex-usage' \
  'github:zz-zhi54/dsh-plugins#path:packages/session-cost' \
  'github:zz-zhi54/dsh-plugins#path:packages/project-mcp'
```

To update an installed plugin, run its `add` command again. When using a fixed release, replace the version tag in the command with the desired release.

For a fixed release, put the version tag before the path. For example, version `v0.1.6-alpha.2.4`:

```sh
# System notifications
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.6-alpha.2.4&path:packages/system-notification'

# Codex login
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.6-alpha.2.4&path:packages/codex-login'

# Codex usage
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.6-alpha.2.4&path:packages/codex-usage'

# Session cost
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.6-alpha.2.4&path:packages/session-cost'

# Project-scoped MCP
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.1.6-alpha.2.4&path:packages/project-mcp'
```

After installation, inspect the Profile:

```sh
dsh --profile web --dump-config
```

### Remove

Remove a plugin by package name:

```sh
# System notifications
dsh plugin --profile web remove dsh-system-notification-plugin

# Codex login
dsh plugin --profile web remove dsh-codex-login-plugin

# Codex usage
dsh plugin --profile web remove dsh-codex-usage-plugin

# Session cost
dsh plugin --profile web remove dsh-session-cost-plugin

# Project-scoped MCP
dsh plugin --profile web remove dsh-project-mcp-plugin
```

Only remove plugins that are actually installed.

For package-specific behavior, limitations, and verification steps, see:

- [Codex login plugin](packages/codex-login/README.md)
- [Codex usage plugin](packages/codex-usage/README.md)
- [Session cost plugin](packages/session-cost/README.md)
- [System notification plugin](packages/system-notification/README.md)
- [Project-scoped MCP plugin](packages/project-mcp/README.md)

## Development

Run dependency installation and checks from the repository root with pnpm:

```sh
pnpm install
pnpm check
```

Check a single package:

```sh
pnpm --filter dsh-codex-login-plugin run check
pnpm --filter dsh-codex-usage-plugin run check
pnpm --filter dsh-codex-usage-plugin run test
pnpm --filter dsh-session-cost-plugin run check
pnpm --filter dsh-session-cost-plugin run test
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

The root workspace has no shared `build`, `test`, lint, or format script. Dependency resolution is maintained in the root `pnpm-lock.yaml`. Do not install dependencies separately with npm or yarn inside a package.

## Repository structure and documentation ownership

- `packages/*/src`: runtime code for each plugin.
- `packages/*/cordis.patch.yml`: Profile entries inserted by the corresponding plugin.
- [`CHANGELOG.md`](CHANGELOG.md): versions, compatibility, and release history.
- [`AGENTS.md`](AGENTS.md): coding-agent constraints, not a user guide.
- `dsh/`: DSH source files deployed to the user's global `~/.dsh/`; it is not part of the pnpm workspace.

Each plugin's `package.json` points to its patch through `dsh.bundle.patch`. A patch only describes component IDs and package names; the implementation remains in the corresponding package. Every plugin can be installed independently without a combination layer or recursive dependency.

## License

The project code is licensed under the [Apache License 2.0](LICENSE). Third-party dependencies and DeepSeek Harness itself remain subject to their own licenses and terms.
