import test from 'node:test'
import assert from 'node:assert/strict'
import { createNotificationObserver } from '../src/observer.mjs'
import {
  APPROVAL_NEEDED_NOTIFICATION,
  TASK_COMPLETED_NOTIFICATION,
} from '../src/messages.mjs'

function recorder() {
  const notifications = []
  return {
    notifications,
    notify(notification) {
      notifications.push(notification)
    },
  }
}

test('notifies when a turn ends normally', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)

  observer.onSessionEvent({}, {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  })

  assert.deepEqual(target.notifications, [TASK_COMPLETED_NOTIFICATION])
})

test('does not treat an unsuccessful turn end as completion', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)

  for (const kind of ['aborted', 'blocked', 'error', 'max-tokens', 'interrupted']) {
    observer.onSessionEvent({}, {
      type: 'turn/end',
      data: { turn: 1, reason: { kind } },
    })
  }

  assert.deepEqual(target.notifications, [])
})

test('notifies each normally completed turn', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)
  const session = {}
  const event = {
    type: 'turn/end',
    data: { turn: 1, reason: { kind: 'completed' } },
  }

  observer.onSessionEvent(session, event)
  observer.onSessionEvent(session, { ...event, data: { turn: 2, reason: { kind: 'completed' } } })

  assert.deepEqual(target.notifications, [TASK_COMPLETED_NOTIFICATION, TASK_COMPLETED_NOTIFICATION])
})

test('notifies approval/asked once per session event', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)
  const session = {}
  const event = {
    type: 'approval/asked',
    seq: 7,
    data: { id: 'approval-1', toolName: 'bash' },
  }

  observer.onSessionEvent(session, event)
  observer.onSessionEvent(session, { ...event })
  observer.onSessionEvent(session, {
    ...event,
    type: 'approval/decided',
  })

  assert.deepEqual(target.notifications, [APPROVAL_NEEDED_NOTIFICATION])
})

test('does not collide when different sessions reuse a sequence number', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)
  const event = {
    type: 'approval/asked',
    seq: 0,
    data: { id: 'approval-1', toolName: 'write' },
  }

  observer.onSessionEvent({}, event)
  observer.onSessionEvent({}, event)

  assert.equal(target.notifications.length, 2)
})
