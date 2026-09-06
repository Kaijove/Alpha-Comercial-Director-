/**
 * Shared Recharts styling.
 *
 * Charts in the command center are quiet by default: one accent line, a muted
 * reference line, hairline grid, no shadows, no gradients beyond a single soft
 * area fill. Colour is reserved for meaning.
 */
export const CHART_COLORS = {
  accent: '#5b8cff',
  accentSoft: 'rgba(91, 140, 255, 0.18)',
  reference: '#4a5361',
  grid: '#1c2029',
  axis: '#616b79',
  positive: '#3fbf8f',
  negative: '#e5675f',
  neutral: '#7c8899',
}

export const axisProps = {
  stroke: 'transparent',
  tick: { fill: CHART_COLORS.axis, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const gridProps = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '0',
  vertical: false,
} as const
