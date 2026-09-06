import { useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LineChart } from 'lucide-react'
import { GRANULARITIES, type Granularity, type TrendPoint } from '@/domain/metrics/trend'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { CHART_COLORS, axisProps, gridProps } from '@/components/charts/chartTheme'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

type SeriesKey = 'previous' | 'target'

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'previous', label: 'Previous period', color: CHART_COLORS.neutral },
  { key: 'target', label: 'Target', color: CHART_COLORS.reference },
]

/**
 * Revenue per bucket, with the equivalent bucket of the previous period and the
 * pro-rata target as optional overlays. Both overlays can be switched off so the
 * chart never has to carry more than the reader wants.
 */
export function RevenueTrend({
  data,
  granularity,
  granularities,
  onGranularityChange,
}: {
  data: TrendPoint[]
  granularity: Granularity
  granularities: Granularity[]
  onGranularityChange: (value: Granularity) => void
}) {
  const fmt = useFormatters()
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const toggle = (key: SeriesKey) => {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const total = data.reduce((sum, point) => sum + point.actual, 0)
  const hasRevenue = total > 0

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Revenue Trend"
        description={`${fmt.currency(total)} won across the selected range.`}
        action={
          granularities.length > 1 ? (
            <SegmentedControl
              value={granularity}
              onChange={onGranularityChange}
              options={GRANULARITIES.filter((option) =>
                granularities.includes(option.value),
              )}
            />
          ) : null
        }
      />

      {hasRevenue ? (
        <>
          <div className="-ml-2 mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="label"
                  {...axisProps}
                  minTickGap={28}
                  interval="preserveStartEnd"
                />
                <YAxis
                  {...axisProps}
                  width={68}
                  tickFormatter={(value: number) => fmt.compact(value)}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={<ChartTooltip format={(value) => fmt.exact(value)} />}
                />
                <Bar
                  dataKey="actual"
                  name="Revenue"
                  fill={CHART_COLORS.accent}
                  fillOpacity={0.75}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={38}
                  // Never animate the primary series in: if the animation
                  // frame does not run, the bars simply do not paint.
                  isAnimationActive={false}
                />
                {!hidden.has('previous') ? (
                  <Line
                    type="monotone"
                    dataKey="previous"
                    name="Previous period"
                    stroke={CHART_COLORS.neutral}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : null}
                {!hidden.has('target') ? (
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke={CHART_COLORS.reference}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs">
            <span className="flex items-center gap-2 text-ink-muted">
              <span
                className="size-2 rounded-[2px]"
                style={{ backgroundColor: CHART_COLORS.accent }}
                aria-hidden
              />
              Revenue
            </span>
            {SERIES.map((series) => {
              const off = hidden.has(series.key)
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => toggle(series.key)}
                  aria-pressed={!off}
                  className={cn(
                    'flex items-center gap-2 rounded-field px-1.5 py-0.5 transition-colors',
                    off ? 'text-ink-faint' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <span
                    className="h-0 w-4 border-t"
                    style={{
                      borderColor: series.color,
                      borderStyle: series.key === 'target' ? 'dashed' : 'solid',
                      opacity: off ? 0.35 : 1,
                    }}
                    aria-hidden
                  />
                  <span className={off ? 'line-through' : undefined}>{series.label}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-6 border-0"
          icon={<LineChart className="size-4" />}
          title="No revenue data available for this period"
          description="No deals were won in the selected range. Widen the range or clear the sales rep filter."
        />
      )}
    </Panel>
  )
}
