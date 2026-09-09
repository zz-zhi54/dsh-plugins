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

test('does not treat an initial idle status as completion', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)

  observer.onAgentStatus({ agent: {}, status: 'idle' })

  assert.deepEqual(target.notifications, [])
})

test('notifies only on a running to idle transition', () => {
  const target = recorder()
  const observer = createNotificationObserver(target)
  const agent = {}

  observer.onAgentStatus({ agent, status: 'idle' })
  observer.onAgentStatus({ agent, status: 'idle' })
  observer.onAgentStatus({ agent, status: 'running' })
  observer.onAgentStatus({ agent, status: 'running' })
  observer.onAgentStatus({ agent, status: 'idle' })
  observer.onAgentStatus({ agent, status: 'idle' })

  assert.deepEqual(target.notifications, [TASK_COMPLETED_NOTIFICATION])
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
