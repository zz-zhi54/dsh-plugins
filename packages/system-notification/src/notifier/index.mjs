import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createMacOsNotifier } from './macos.mjs'
import { createWindowsNotifier } from './windows.mjs'

const execFileAsync = promisify(execFile)

// 平台差异只在这里选择一次，事件观察器不需要知道具体系统命令。
const platformFactories = Object.freeze({
  darwin: createMacOsNotifier,
  win32: createWindowsNotifier,
})

function runCommand(file, args) {
  // execFile 不经过 shell，参数不会被再次解析为 shell 命令。
  return execFileAsync(file, args, { windowsHide: true })
}

function createNoopNotifier() {
  return {
    notify() {},
  }
}

export function createNotifier({ platform = process.platform, runCommand: commandRunner = runCommand } = {}) {
  const factory = platformFactories[platform]
  // 未支持的平台保持旁路插件可加载，但不尝试执行 Linux 等平台命令。
  return factory === undefined ? createNoopNotifier() : factory(commandRunner)
}
