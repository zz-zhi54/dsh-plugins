// PowerShell 单引号字符串中，单引号用两个单引号表示。
function powerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

export function buildNotificationScript({ title, body }) {
  return [
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    '$notification = New-Object System.Windows.Forms.NotifyIcon',
    '$notification.Icon = [System.Drawing.SystemIcons]::Information',
    `$notification.BalloonTipTitle = ${powerShellLiteral(title)}`,
    `$notification.BalloonTipText = ${powerShellLiteral(body)}`,
    '$notification.Visible = $true',
    '$notification.ShowBalloonTip(5000)',
    // 子进程必须短暂存活，否则 NotifyIcon 可能立即被系统回收。
    'Start-Sleep -Milliseconds 5500',
    '$notification.Dispose()',
  ].join('; ')
}

export function createWindowsNotifier(runCommand) {
  return {
    notify(notification) {
      // NotifyIcon 是 Windows PowerShell/.NET 自带能力，不需要 BurntToast 等模块。
      return runCommand('powershell.exe', [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        buildNotificationScript(notification),
      ])
    },
  }
}
