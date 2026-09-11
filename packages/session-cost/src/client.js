window.__ModuleLoader__.load({
  id: 'dsh-session-cost-plugin',
  factory: require => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')

    const ENDPOINT = '/api/session-cost'

    const ROW_STYLE = {
      maxWidth: 'var(--dsh-chat-content-width, 100%)',
      boxSizing: 'border-box',
      width: '100%',
      padding: '4px calc(var(--dsh-composer-side-clearance, 0px) + 16px) 0',
      fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
      lineHeight: 'calc(20px + var(--dsh-content-font-delta-secondary, 0px))',
      justifyContent: 'center',
      gap: 12,
      margin: '0 auto',
      display: 'flex',
      position: 'relative',
    }

    const PILL_STYLE = {
      boxSizing: 'border-box',
      maxWidth: '100%',
      color: 'var(--dsw-alias-label-tertiary)',
      font: 'inherit',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 'inherit',
      whiteSpace: 'nowrap',
      background: 'transparent',
      border: 'none',
      borderRadius: 24,
      alignItems: 'center',
      gap: 6,
      padding: '1px 8px',
      display: 'inline-flex',
      cursor: 'pointer',
    }

    const PILL_HOVER_STYLE = {
      background: 'var(--dsw-alias-interactive-bg-hover)',
      color: 'var(--dsw-alias-label-secondary)',
    }

    const DIALOG_STYLE = {
      position: 'absolute',
      zIndex: 10,
      left: '50%',
      bottom: 'calc(100% + 8px)',
      transform: 'translateX(-50%)',
      boxSizing: 'border-box',
      width: 'min(420px, calc(100vw - 32px))',
      maxHeight: 'min(420px, calc(100vh - 120px))',
      overflow: 'auto',
      padding: '12px 14px',
      color: 'var(--dsw-alias-label-primary)',
      background: 'var(--dsw-specific-tip, var(--dsw-alias-bg-layer-1))',
      border: '0.5px solid var(--dsw-alias-border-l1)',
      borderRadius: 12,
      boxShadow: '0 8px 28px rgb(0 0 0 / 18%)',
      textAlign: 'left',
    }

    const DIALOG_TITLE_STYLE = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontWeight: 600,
      lineHeight: '20px',
    }

    const RULE_STYLE = {
      height: 1,
      margin: '10px 0',
      background: 'var(--dsw-alias-border-l1)',
    }

    const LIST_STYLE = {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }

    const GROUP_BUTTON_STYLE = {
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '7px 8px',
      color: 'var(--dsw-alias-label-primary)',
      font: 'inherit',
      fontSize: '12px',
      lineHeight: '18px',
      textAlign: 'left',
      background: 'transparent',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
    }

    const DETAIL_STYLE = {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '3px 16px',
      margin: '0 8px 7px',
      padding: '7px 8px',
      color: 'var(--dsw-alias-label-secondary)',
      background: 'var(--dsw-alias-bg-layer-2, rgb(127 127 127 / 8%))',
      borderRadius: 8,
      fontSize: '12px',
      lineHeight: '18px',
    }

    const MUTED_STYLE = {
      color: 'var(--dsw-alias-label-secondary)',
    }

    function formatTokens(value) {
      if (!Number.isSafeInteger(value)) return '—'
      return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    function formatCost(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '未知'
      if (value === 0) return '$0.00'
      const digits = value >= 1 ? 2 : value >= 0.01 ? 4 : value >= 0.0001 ? 6 : 8
      return '$' + value.toFixed(digits)
    }

    function costText(value, pricing) {
      if (pricing === 'unknown' || value === null) return '未知'
      if (pricing === 'partial') return formatCost(value) + ' + 未知'
      return formatCost(value)
    }

    function projectionTokens(usage) {
      if (usage === null || typeof usage !== 'object') return null
      const inputTokens = Number.isSafeInteger(usage.uncachedInputTokens)
        ? usage.uncachedInputTokens
        : usage.inputTokens
      const outputTokens = usage.outputTokens
      const cacheReadTokens = usage.cacheReadTokens
      const cacheWriteTokens = usage.cacheWriteTokens
      if (!Number.isSafeInteger(inputTokens) || !Number.isSafeInteger(outputTokens)) return null
      const input = inputTokens >= 0 ? inputTokens : 0
      const output = outputTokens >= 0 ? outputTokens : 0
      const cacheRead = Number.isSafeInteger(cacheReadTokens) && cacheReadTokens >= 0 ? cacheReadTokens : 0
      const cacheWrite = Number.isSafeInteger(cacheWriteTokens) && cacheWriteTokens >= 0 ? cacheWriteTokens : 0
      return {
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheWriteTokens: cacheWrite,
        totalTokens: input + output + cacheRead + cacheWrite,
      }
    }

    function hasProjectionTokens(usage) {
      const tokens = projectionTokens(usage)
      return tokens !== null && tokens.totalTokens > 0
    }

    function DetailRows(props) {
      const rows = [
        ['输入', props.tokens.inputTokens],
        ['输出', props.tokens.outputTokens],
        ['缓存读取', props.tokens.cacheReadTokens],
        ['缓存写入', props.tokens.cacheWriteTokens],
        ['请求次数', props.requests],
      ]
      return React.createElement(React.Fragment, null,
        rows.flatMap(([label, value]) => [
          React.createElement('dt', { key: label + '-label' }, label),
          React.createElement('dd', { key: label + '-value', style: { margin: 0, textAlign: 'right' } }, formatTokens(value)),
        ]),
      )
    }

    function TokenDialog(props) {
      const tokens = projectionTokens(props.usage)
      if (tokens === null) return null
      return React.createElement('div', {
        role: 'dialog',
        'aria-label': 'Token 统计',
        style: DIALOG_STYLE,
      },
      React.createElement('div', { style: DIALOG_TITLE_STYLE },
        React.createElement('span', null, 'Token 统计'),
        React.createElement('span', { style: MUTED_STYLE }, formatTokens(tokens.totalTokens)),
      ),
      React.createElement('div', { style: RULE_STYLE, 'aria-hidden': true }),
      React.createElement('dl', { style: DETAIL_STYLE },
        React.createElement(DetailRows, { tokens, requests: '—' }),
      ))
    }

    function CostDialog(props) {
      const value = props.value
      return React.createElement('div', {
        role: 'dialog',
        'aria-label': 'Token 费用统计',
        style: DIALOG_STYLE,
      },
      React.createElement('div', { style: DIALOG_TITLE_STYLE },
        React.createElement('span', null, 'Token 费用统计'),
        React.createElement('span', { style: MUTED_STYLE }, value.currency || 'USD'),
      ),
      React.createElement('div', { style: RULE_STYLE, 'aria-hidden': true }),
      React.createElement('div', { style: LIST_STYLE }, value.groups.map(group => {
        const expanded = props.expanded === group.key
        const label = (group.provider || '未知') + ' / ' + (group.model || '未知')
        return React.createElement(React.Fragment, { key: group.key },
          React.createElement('button', {
            type: 'button',
            style: GROUP_BUTTON_STYLE,
            'aria-expanded': expanded,
            onClick: () => props.onExpand(expanded ? null : group.key),
          },
          React.createElement('span', { style: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, label),
          React.createElement('span', { style: { flex: 'none', whiteSpace: 'nowrap' } },
            formatTokens(group.tokens.totalTokens) + ' · ' + costText(group.cost, group.pricing),
          )),
          expanded && React.createElement('dl', { style: DETAIL_STYLE },
            React.createElement(DetailRows, { tokens: group.tokens, requests: group.requests }),
            React.createElement('dt', null, '费用'),
            React.createElement('dd', { style: { margin: 0, textAlign: 'right' } }, costText(group.cost, group.pricing)),
          ),
        )
      })),
      value.pricing === 'partial' && React.createElement('div', { style: Object.assign({}, MUTED_STYLE, { marginTop: 9, fontSize: '12px' }) },
        '* 部分 provider/model 不在 pi-ai 内置价格目录中',
      ),
      value.pricing === 'unknown' && React.createElement('div', { style: Object.assign({}, MUTED_STYLE, { marginTop: 9, fontSize: '12px' }) },
        '没有匹配到 pi-ai 内置价格，未猜测费用',
      ))
    }

    function TimePill(props) {
      const stats = props.stats
      if (stats === null || typeof stats !== 'object' || !Number.isSafeInteger(stats.steps) || stats.steps <= 0) return null
      const label = formatTokens(stats.turns) + ' 轮 · ' + formatTokens(stats.steps) + ' 步'
      return React.createElement('span', null,
        React.createElement('button', {
          type: 'button',
          style: PILL_STYLE,
          'aria-label': label,
          onClick: () => props.onOpen('time'),
        }, '◷ ' + label),
      )
    }

    async function readCost(sessionId) {
      try {
        const response = await fetch(ENDPOINT + '?sessionId=' + encodeURIComponent(sessionId))
        const value = await response.json()
        if (value === null || typeof value !== 'object' || value.ok !== true) return { phase: 'error' }
        return { phase: 'ready', value }
      } catch {
        return { phase: 'error' }
      }
    }

    function SessionStats(props) {
      const usage = props.useProjection('tokenUsage')
      const stats = props.useProjection('sessionStats')
      const [costState, setCostState] = React.useState({ phase: 'loading' })
      const [open, setOpen] = React.useState(null)
      const [expanded, setExpanded] = React.useState(null)
      const hasTokens = hasProjectionTokens(usage)

      React.useEffect(() => {
        let live = true
        if (!hasTokens || typeof props.sessionId !== 'string' || props.sessionId.length === 0) {
          setCostState({ phase: 'empty' })
          return () => {
            live = false
          }
        }
        setCostState({ phase: 'loading' })
        void readCost(props.sessionId).then(value => {
          if (live) setCostState(value)
        })
        return () => {
          live = false
        }
      }, [props.sessionId, usage, hasTokens])

      if (!hasTokens && (stats === null || typeof stats !== 'object' || stats.steps <= 0)) return null

      const costValue = costState.phase === 'ready' ? costState.value : null
      const costLabel = costValue === null
        ? costState.phase === 'loading' ? '费用 …' : '费用不可用'
        : '费用 ' + costText(costValue.cost, costValue.pricing)
      const tokens = projectionTokens(usage)
      const children = []

      if (stats !== null && typeof stats === 'object' && stats.steps > 0) {
        children.push(React.createElement(TimePill, {
          key: 'time',
          stats,
          onOpen: setOpen,
        }))
      }

      if (hasTokens && tokens !== null) {
        children.push(React.createElement('span', { key: 'tokens' },
          React.createElement('button', {
            type: 'button',
            style: PILL_STYLE,
            'aria-haspopup': 'dialog',
            'aria-expanded': open === 'tokens',
            onClick: () => setOpen(open === 'tokens' ? null : 'tokens'),
          }, 'Tokens ' + formatTokens(tokens.totalTokens)),
        ))
      }

      if (costValue !== null && costValue.requests > 0) {
        children.push(React.createElement('span', { key: 'cost' },
          React.createElement('button', {
            type: 'button',
            style: PILL_STYLE,
            'aria-haspopup': 'dialog',
            'aria-expanded': open === 'cost',
            onClick: () => setOpen(open === 'cost' ? null : 'cost'),
          }, costLabel),
        ))
      }

      let dialog = null
      if (open === 'tokens') dialog = React.createElement(TokenDialog, { usage, key: 'tokens-dialog' })
      if (open === 'cost' && costValue !== null) {
        dialog = React.createElement(CostDialog, {
          key: 'cost-dialog',
          value: costValue,
          expanded,
          onExpand: setExpanded,
        })
      }

      return React.createElement('div', { style: ROW_STYLE }, children, dialog)
    }

    const inject = ['slots']

    function apply(ctx) {
      const slots = ctx.slots
      slots.inject('conversation.composer.dock', () => slots.register({
        name: 'conversation.composer.dock',
        id: 'stats',
        order: 0,
        priority: -1,
      }, props => React.createElement(SessionStats, props)))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
