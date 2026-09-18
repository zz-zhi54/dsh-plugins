// Browser bundle for the dsh-codex-usage-plugin client half.
//
// The web module graph serves plugin `./client` exports verbatim inside a
// concatenated classic script and requires the factory-form CJS shape the
// shipped packages build (`window.__ModuleLoader__.load({ id, factory })`).
// A raw ESM source here would be a SyntaxError for the WHOLE application
// combo, so this file is the bundle; keep it in sync with the logic it
// carries. The only baseline request is `react`, answered by the static
// platform module table — no `dsh.client.external` entries are needed.
//
// 数据只来自 Host 路由 `/api/codex-usage`，响应里只有投影后的额度标量；
// 凭据与原始上游响应不会到达浏览器。样式全部内联，不向 document 注入任何全局 CSS。
// 收起态即全部信息：剩余额度 + 刷新倒计时，没有悬浮面板。
window.__ModuleLoader__.load({
  id: 'dsh-codex-usage-plugin',
  factory: require => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')

    const ENDPOINT = '/api/codex-usage'
    /** 轮询间隔：额度只在用 Codex 时变化，5 分钟足够。 */
    const REFRESH_MS = 300000
    /** 刷新倒计时的重渲染间隔。 */
    const TICK_MS = 30000
    /** 连续失败达到这个次数就停止自动轮询，改为等用户点击重试。 */
    const MAX_FAILURES = 3

    const ROOT_STYLE = {
      boxSizing: 'border-box',
      maxWidth: 'var(--dsh-chat-content-width, 100%)',
      // 只占用额度文字的实际宽度，避免把 DSH 内置 stats 压缩成省略号。
      width: 'auto',
      // 外层 dock 负责模块间距；这里不再叠加 auto margin 和水平 padding。
      margin: 0,
      padding: '4px 0 0',
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
      fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
      lineHeight: '20px',
    }

    const PILL_BASE_STYLE = {
      boxSizing: 'border-box',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      maxWidth: '100%',
      padding: '1px 8px',
      border: 'none',
      borderRadius: 24,
      font: 'inherit',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    }

    /** 失败与暂停态的提示；它本身就是一个可点击的重试按钮，不是纯文本。 */
    const NOTICE_STYLE = {
      background: 'transparent',
      border: 'none',
      padding: '1px 8px',
      borderRadius: 24,
      font: 'inherit',
      color: 'var(--dsw-alias-label-secondary)',
      opacity: 0.65,
      cursor: 'pointer',
    }
    // separator-primary 不是当前主题公开 token；使用已声明的次要文字色，避免分隔点隐形。
    const SEP_STYLE = {
      color: 'var(--dsw-alias-label-secondary)',
      opacity: 0.65,
    }

    /** 高用量配色：只给"剩余"这一段上色，余量越少越醒目。 */
    function toneStyle(usedPercent) {
      if (usedPercent >= 90) return { color: 'var(--dsw-alias-state-error-primary)' }
      if (usedPercent >= 75) return { color: 'var(--dsw-alias-state-warn-primary)' }
      return null
    }

    /** 窗口标签使用统一的英文单位：5h、1w；未知的小窗口退回分钟。 */
    const WINDOW_UNITS = [
      { minutes: 10080, suffix: 'w' },
      { minutes: 1440, suffix: 'd' },
      { minutes: 60, suffix: 'h' },
    ]

    function windowLabel(bucket) {
      const minutes = bucket.windowMinutes
      if (typeof minutes !== 'number' || !isFinite(minutes) || minutes <= 0) return 'quota'
      const unit = WINDOW_UNITS.find(candidate => minutes >= candidate.minutes) ?? { minutes: 1, suffix: 'm' }
      return Math.round(minutes / unit.minutes) + unit.suffix
    }

    const remainingOf = bucket => Math.max(0, 100 - bucket.usedPercent)

    // 用数据表拆分剩余时间，只显示天、小时和分钟，避免逐单位堆叠 if。
    const DURATION_UNITS = [
      { seconds: 86400, suffix: 'd' },
      { seconds: 3600, suffix: 'h' },
      { seconds: 60, suffix: 'm' },
    ]

    function durationText(ms) {
      let remaining = Math.max(0, Math.floor(ms / 1000))
      const parts = []
      for (const unit of DURATION_UNITS) {
        const amount = Math.floor(remaining / unit.seconds)
        if (amount > 0) parts.push(amount + unit.suffix)
        remaining %= unit.seconds
      }
      return parts.length > 0 ? parts.join(' ') : '<1m'
    }

    /** 距离窗口重置还有多久；取不到时隐藏，已到期时显示 <1m。 */
    function resetIn(resetsAt) {
      if (typeof resetsAt !== 'number' || !isFinite(resetsAt)) return null
      const left = resetsAt * 1000 - Date.now()
      return left <= 0 ? '<1m' : durationText(left)
    }

    /**
     * 取一次额度。Host 无论成功失败都回 200，失败语义在响应体的 ok 字段里。
     * @param force - 点击刷新时绕过 Host 缓存。
     */
    async function readUsage(force) {
      try {
        const response = await fetch(force === true ? ENDPOINT + '?force=1' : ENDPOINT)
        const value = await response.json()
        if (value === null || typeof value !== 'object' || value.ok !== true) {
          const reason = value !== null && typeof value === 'object' && typeof value.reason === 'string'
            ? value.reason
            : '取不到 Codex 额度'
          return { phase: 'error', reason }
        }
        return { phase: 'ready', usage: value.usage }
      } catch (error) {
        return { phase: 'error', reason: '无法访问 Host 路由 /api/codex-usage' }
      }
    }

    function CodexUsage(props) {
      const timer = props.timer
      const [state, setState] = React.useState({ phase: 'loading' })
      // 跨渲染保持同一引用的容器，用来表达"组件是否还在"与"连续失败了几次"。
      // 用 useState 的惰性初始化保证只创建一次，避免为此额外引入 useRef。
      const [tracker] = React.useState(() => ({ alive: true, failures: 0 }))
      const [paused, setPaused] = React.useState(false)
      const [hover, setHover] = React.useState(false)
      const [, setTick] = React.useState(0)

      // 只有真正卸载才把 alive 置假。不能用轮询 effect 的清理来表示卸载 ——
      // 进入暂停时那个清理同样会跑，那时组件其实还在。
      React.useEffect(() => {
        tracker.alive = true
        return () => {
          tracker.alive = false
        }
      }, [])

      // 自动轮询。连续失败达到上限就把 paused 置真，本 effect 随之清理、轮询彻底停下，
      // 之后只由用户点击重试 —— 既不再打上游，也不会在失败态里反复刷新界面。
      React.useEffect(() => {
        if (paused) return undefined
        const attempt = async () => {
          const next = await readUsage(false)
          if (!tracker.alive) return
          setState(next)
          if (next.phase !== 'error') {
            tracker.failures = 0
            return
          }
          tracker.failures += 1
          if (tracker.failures >= MAX_FAILURES) setPaused(true)
        }
        void attempt()
        const stop = timer.interval(() => { void attempt() }, REFRESH_MS)
        return stop
      }, [paused])

      // 刷新倒计时跟着时间走，每 30s 重渲染一次就够了
      React.useEffect(() => timer.interval(() => setTick(value => value + 1), TICK_MS), [])

      // 点击：强制查一次并绕过 Host 缓存。成功就恢复自动轮询；仍失败则保持暂停，等下一次点击。
      const retry = () => {
        void readUsage(true).then(next => {
          if (!tracker.alive) return
          setState(next)
          if (next.phase === 'error') return
          // 手动成功要把连续失败清零，否则"手动刷新成功 → 下次自动轮询失败"会立刻触发暂停
          tracker.failures = 0
          setPaused(false)
        })
      }

      if (state.phase === 'loading') return null

      if (state.phase === 'error') {
        return React.createElement('div', { style: ROOT_STYLE },
          React.createElement('button', {
            type: 'button',
            style: Object.assign({}, NOTICE_STYLE, {
              background: hover ? 'var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2))' : 'transparent',
            }),
            title: state.reason,
            onMouseEnter: () => setHover(true),
            onMouseLeave: () => setHover(false),
            onClick: retry,
          }, paused ? 'Codex 额度已暂停 · 点击重试' : 'Codex 额度不可用 · 点击重试'))
      }

      const usage = state.usage
      if (usage === null || typeof usage !== 'object') return null

      const buckets = []
      if (usage.primary !== null && usage.primary !== undefined) buckets.push(usage.primary)
      if (usage.secondary !== null && usage.secondary !== undefined) buckets.push(usage.secondary)

      const pill = [React.createElement('span', { key: 'brand' }, 'Codex')]
      for (const bucket of buckets) {
        const label = windowLabel(bucket)
        const reset = resetIn(bucket.resetsAt)
        pill.push(React.createElement('span', { key: label + '-sep', style: SEP_STYLE }, '·'))
        pill.push(React.createElement('span', { key: label + '-label' }, label))
        pill.push(React.createElement('span', { key: label + '-left', style: toneStyle(bucket.usedPercent) },
          Math.round(remainingOf(bucket)) + '%'))
        if (reset !== null) pill.push(React.createElement('span', { key: label + '-reset' }, reset))
      }

      const pillStyle = Object.assign({}, PILL_BASE_STYLE, {
        background: hover ? 'var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-layer-2))' : 'transparent',
        color: hover
          ? 'var(--dsw-alias-label-secondary)'
          : 'var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary))',
      })

      return React.createElement('div', { style: ROOT_STYLE },
        React.createElement('button', {
          type: 'button',
          style: pillStyle,
          title: '点击刷新 Codex 额度',
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          onFocus: () => setHover(true),
          onBlur: () => setHover(false),
          onClick: retry,
        }, pill))
    }

    // slots：注册进 composer 下方的 dock；timer：轮询与倒计时用的可释放定时器。
    const inject = ['slots', 'timer']

    function apply(ctx) {
      const slots = ctx.slots
      const timer = ctx.timer
      // order 20：内置 stats 是 order 0，费用条目是 order 10，本条目排在费用下面一行。
      slots.inject('conversation.composer.dock', () => slots.register({
        name: 'conversation.composer.dock',
        id: 'codex-usage',
        order: 20,
      }, () => React.createElement(CodexUsage, { timer })))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
