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

    const ROOT_STYLE = {
      boxSizing: 'border-box',
      maxWidth: 'var(--dsh-chat-content-width, 100%)',
      width: '100%',
      margin: '0 auto',
      padding: '4px calc(var(--dsh-composer-side-clearance, 0px) + 16px) 0',
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

    const DIM_STYLE = { color: 'var(--dsw-alias-label-secondary)', opacity: 0.65, cursor: 'default' }
    const SEP_STYLE = { color: 'var(--dsw-alias-separator-primary, var(--dsw-alias-border-l1))' }

    /** 高用量配色：只给"剩余"这一段上色，余量越少越醒目。 */
    function toneStyle(usedPercent) {
      if (usedPercent >= 90) return { color: 'var(--dsw-alias-state-error-primary)' }
      if (usedPercent >= 75) return { color: 'var(--dsw-alias-state-warn-primary)' }
      return null
    }

    /** 窗口标签：primary 是 5h，secondary 是周。按窗口时长推断，避免写死。 */
    function windowLabel(bucket) {
      const minutes = bucket.windowMinutes
      if (typeof minutes !== 'number' || !isFinite(minutes) || minutes <= 0) return '额度'
      if (minutes >= 10080) return '周'
      if (minutes >= 1440) return Math.round(minutes / 1440) + ' 天'
      return Math.round(minutes / 60) + 'h'
    }

    const remainingOf = bucket => Math.max(0, 100 - bucket.usedPercent)

    function durationText(ms) {
      const minutes = Math.floor(ms / 60000)
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      if (days > 0) return days + ' 天 ' + hours + ' 小时'
      if (hours > 0) return hours + ' 小时 ' + (minutes % 60) + ' 分'
      return (minutes % 60) + ' 分'
    }

    /** 距离窗口重置还有多久；取不到或已到期时给一句话。 */
    function resetIn(resetsAt) {
      if (typeof resetsAt !== 'number' || !isFinite(resetsAt)) return null
      const left = resetsAt * 1000 - Date.now()
      return left <= 0 ? '即将刷新' : durationText(left) + '后刷新'
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
      const [hover, setHover] = React.useState(false)
      const [, setTick] = React.useState(0)

      React.useEffect(() => {
        let live = true
        const run = () => {
          void readUsage(false).then(next => {
            if (live) setState(next)
          })
        }
        run()
        const stop = timer.interval(run, REFRESH_MS)
        return () => {
          live = false
          stop()
        }
      }, [])

      // 刷新倒计时跟着时间走，每 30s 重渲染一次就够了
      React.useEffect(() => timer.interval(() => setTick(value => value + 1), TICK_MS), [])

      const refresh = () => {
        void readUsage(true).then(setState)
      }

      if (state.phase === 'loading') return null

      if (state.phase === 'error') {
        return React.createElement('div', { style: ROOT_STYLE },
          React.createElement('span', { style: DIM_STYLE, title: state.reason }, 'Codex 额度不可用'))
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
          '剩 ' + Math.round(remainingOf(bucket)) + '%'))
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
          onClick: refresh,
        }, pill))
    }

    // slots：注册进 composer 下方的 dock；timer：轮询与倒计时用的可释放定时器。
    const inject = ['slots', 'timer']

    function apply(ctx) {
      const slots = ctx.slots
      const timer = ctx.timer
      // order 1：内置用量 pill（id "stats"）是 order 0，本条目排在它下面一行。
      slots.inject('conversation.composer.dock', () => slots.register({
        name: 'conversation.composer.dock',
        id: 'codex-usage',
        order: 1,
      }, () => React.createElement(CodexUsage, { timer })))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
