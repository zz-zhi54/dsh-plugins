// JSON 字符串字面量与 AppleScript 的双引号文本兼容，可处理通知文本中的引号。
function appleScriptLiteral(value) {
  return JSON.stringify(String(value))
}

export function buildNotificationScript({ title, body }) {
  return `display notification ${appleScriptLiteral(body)} with title ${appleScriptLiteral(title)}`
}

export function createMacOsNotifier(runCommand) {
  return {
    notify(notification) {
      // 通过参数传递脚本，避免拼接 shell 命令。
      return runCommand('osascript', ['-e', buildNotificationScript(notification)])
    },
  }
}
