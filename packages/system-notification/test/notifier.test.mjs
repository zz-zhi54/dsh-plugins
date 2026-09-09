import test from 'node:test'
import assert from 'node:assert/strict'
import { createNotifier } from '../src/notifier/index.mjs'
import { buildNotificationScript as buildMacOsScript } from '../src/notifier/macos.mjs'
import { buildNotificationScript as buildWindowsScript } from '../src/notifier/windows.mjs'

const notification = { title: 'DSH', body: '等待你的确认' }

test('uses osascript for macOS notifications', async () => {
  const calls = []
  const notifier = createNotifier({
    platform: 'darwin',
    runCommand: async (...args) => { calls.push(args) },
  })

  await notifier.notify(notification)

  assert.deepEqual(calls, [['osascript', ['-e', buildMacOsScript(notification)]]])
})

test('uses built-in PowerShell NotifyIcon for Windows notifications', async () => {
  const calls = []
  const notifier = createNotifier({
    platform: 'win32',
    runCommand: async (...args) => { calls.push(args) },
  })

  await notifier.notify(notification)

  assert.deepEqual(calls[0][0], 'powershell.exe')
  assert.deepEqual(calls[0][1].slice(0, -1), [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-WindowStyle',
    'Hidden',
    '-Command',
  ])
  assert.equal(calls[0][1].at(-1), buildWindowsScript(notification))
  assert.match(calls[0][1].at(-1), /System\.Windows\.Forms\.NotifyIcon/)
})

test('does nothing on unsupported platforms', () => {
  let called = false
  const notifier = createNotifier({
    platform: 'linux',
    runCommand: () => { called = true },
  })

  notifier.notify(notification)

  assert.equal(called, false)
})
