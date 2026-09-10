import { createNotificationObserver } from './observer.mjs'
import { createNotifier } from './notifier/index.mjs'

/** 仅观察运行时事件，不参与 Agent 或审批流程。 */
export const name = 'system-notification'

function renderError(error) {
  return error instanceof Error ? error.message : String(error)
}

export function apply(ctx) {
  const observer = createNotificationObserver(
    createNotifier(),
    error => ctx.logger.warn(`system-notification: native notification failed: ${renderError(error)}`),
  )

  // ctx.on() 注册的监听器随插件生命周期自动清理；这里不需要手动接管事件。
  ctx.on('session/event', observer.onSessionEvent)
}
