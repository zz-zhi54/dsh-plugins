import {
  APPROVAL_NEEDED_NOTIFICATION,
  TASK_COMPLETED_NOTIFICATION,
} from './messages.mjs'

function ignoreError() {}

/**
 * 通知失败只能记录，不能反向影响 Agent 循环或已提交的 Session 事件。
 */
function safelyNotify(notifier, notification, onError) {
  try {
    void Promise.resolve(notifier.notify(notification)).catch(onError)
  } catch (error) {
    onError(error)
  }
}

/**
 * Session 的 seq 是当前持久化事件的稳定位置；WeakMap 则避免长期持有已销毁的 Session。
 */
function isNewApprovalEvent(session, event, seenEvents) {
  let sequences = seenEvents.get(session)
  if (sequences === undefined) {
    sequences = new Set()
    seenEvents.set(session, sequences)
  }

  if (sequences.has(event.seq)) return false
  sequences.add(event.seq)
  return true
}

export function createNotificationObserver(notifier, onError = ignoreError) {
  const approvalSequencesBySession = new WeakMap()

  function onSessionEvent(session, event) {
    if (event.type === 'turn/end') {
      if (event.data?.reason?.kind !== 'completed') return
      safelyNotify(notifier, TASK_COMPLETED_NOTIFICATION, onError)
      return
    }

    if (event.type !== 'approval/asked') return
    // 只观察已提交的审批审计事件，不调用审批服务，也不注册 answerer。
    if (!isNewApprovalEvent(session, event, approvalSequencesBySession)) return
    safelyNotify(notifier, APPROVAL_NEEDED_NOTIFICATION, onError)
  }

  return { onSessionEvent }
}
