# dsh-plugins

[中文](README.md)

A personally maintained DeepSeek Harness (DSH) plugin repository organized as a pnpm workspace. Only the system notification plugin is currently maintained.

> This is an unofficial community project maintained independently of DeepSeek AI and the official DeepSeek Harness team.
>
> This README covers installation and repository structure. The package README describes behavior and limitations. For versions, DSH compatibility, and release history, see [`CHANGELOG.md`](CHANGELOG.md) and the plugin's [`package.json`](packages/system-notification/package.json).

## Plugin overview

The verified development baseline is the officially released DSH `v0.2.2-rc.1`. It records the environment used for validation, rather than restricting installation to that version. The notification plugin uses Host-provided APIs and declares no `engines.dsh` or Host peer dependency constraints. DSH version changes alone do not require a plugin update; changes to the event contracts require compatibility work. Historical tags retain their original metadata.

| Plugin | Package name | Purpose | Details |
| --- | --- | --- | --- |
| [`packages/system-notification`](packages/system-notification/) | `dsh-system-notification-plugin` | Watches task and approval events and sends native macOS / Windows notifications | [`README`](packages/system-notification/README.md) |

I now use Magpie, which meets the needs I previously used the Codex login, Codex usage, and Session cost plugins for. I have therefore stopped maintaining and removed these three plugins, keeping only system notifications. Their implementations remain available in Git history and older release tags.

## Design principles

- **Minimal dependencies and code:** use only what the feature needs and prefer DSH services and extension points.
- **Focused and stable:** provide small capabilities for practical use cases and keep maintenance costs low.
- **Minimal intrusion:** connect through an independent Profile layer without modifying DSH core or taking over the Agent loop or approval flow.
- **Open collaboration:** issues and pull requests for problems, suggestions, documentation, tests, and implementations are welcome.
- **Stability first:** preserve existing behavior and public contracts; notification failures must not affect the DSH main flow.
- **Upstream first and removable:** remove plugins when DSH provides an equivalent official capability.

## Contributing

Issues and pull requests are welcome. Keep changes focused, prefer public DSH services and extension points, update relevant tests and documentation, and describe validation.

## Installation, removal, and updates

You do not need to clone this repository or preinstall other plugins. For desktop installation, updates, or removal, replace `--profile web` with `--profile desktop`.

### Install and update

Install the system notification plugin from `main`:

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#main&path:packages/system-notification'
```

To get later changes from `main`, run the same `add` command again or update the plugin through the plugin manager. Installing from a branch does not continuously synchronize its code into a running DSH process.

To pin the released version `v0.2.2-rc.1.2`, use:

```sh
dsh plugin --profile web add 'github:zz-zhi54/dsh-plugins#v0.2.2-rc.1.2&path:packages/system-notification'
```

This version removes the Host version restrictions. Historical tags retain their original constraints.

After installation, inspect the Profile:

```sh
dsh --profile web --dump-config
```

### Remove

```sh
dsh plugin --profile web remove dsh-system-notification-plugin
```

If any retired plugins are installed, remove the applicable packages:

```sh
dsh plugin --profile web remove dsh-codex-login-plugin
dsh plugin --profile web remove dsh-codex-usage-plugin
dsh plugin --profile web remove dsh-session-cost-plugin
```

See the [plugin README](packages/system-notification/README.md) for notification behavior, platform limitations, and manual verification.

## Development

Run dependency installation and checks from the repository root with pnpm:

```sh
pnpm install
pnpm check
pnpm -r --if-present run test
git diff --check
```

Check the notification plugin independently:

```sh
pnpm --filter dsh-system-notification-plugin run check
pnpm --filter dsh-system-notification-plugin run test
```

Dependency resolution is maintained in the root [`pnpm-lock.yaml`](pnpm-lock.yaml), with pnpm's default peer auto-installation behavior. Do not install dependencies separately with npm or yarn inside a package.

## Repository structure and documentation ownership

- [`packages/system-notification`](packages/system-notification/): notification runtime code, Profile patch, icon, tests, and documentation.
- [`CHANGELOG.md`](CHANGELOG.md): versions, compatibility, and release history.
- [`docs/compatibility`](docs/compatibility/): upstream compatibility audits.
- [`AGENTS.md`](AGENTS.md): coding-agent constraints.
- `dsh/`: DSH source files deployed to the user's global `~/.dsh/`; outside the pnpm workspace.

The plugin's [`package.json`](packages/system-notification/package.json) points to its Profile patch through `dsh.bundle.patch`. The patch describes component IDs and package names; implementation remains in the plugin, with no combination layer or recursive dependency.

## License

The project code is licensed under the [Apache License 2.0](LICENSE). Third-party dependencies and DeepSeek Harness itself remain subject to their own licenses and terms.
