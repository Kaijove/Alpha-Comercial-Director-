import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { LineChart } from 'lucide-react'
import type { Opportunity } from '@/domain/commerce'
import { revenueSeries, CHART_RANGES, type ChartRange } from '@/domain/metrics/series'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { CHART_COLORS, axisProps, gridProps } from '@/components/charts/chartTheme'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * Cumulative revenue against the pro-rata commitment.
 *
 * Cumulative rather than per-day because the question a director asks is "are
 * we ahead or behind by now", which a daily bar chart cannot answer at a glance.
 */
export function RevenuePerformance({
  opportunities,
  monthlyTarget,
  now,
}: {
  opportunities: Opportunity[]
  monthlyTarget: number
  now: Date
}) {
  const [range, setRange] = useState<ChartRange>('30d')
  const fmt = useFormatters()

  const data = useMemo(
    () => revenueSeries(opportunities, range, now, monthlyTarget / 30.44, fmt.locale),
    [opportunities, range, now, monthlyTarget, fmt.locale],
  )

  const last = data[data.length - 1]
  const hasRevenue = data.some((point) => point.revenue > 0)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Revenue Performance"
        description={
          last
            ? `${fmt.currency(last.cumulative)} won in this range against ${fmt.currency(last.target)} of pro-rata target.`
            : undefined
        }
        action={
          <SegmentedControl
            value={range}
            onChange={setRange}
            options={CHART_RANGES}
          />
        }
      />

      {hasRevenue ? (
        <>
          <div className="-ml-2 mt-6 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.accent} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={CHART_COLORS.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                  cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
                  content={
                    <ChartTooltip format={(value) => fmt.exact(value)} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Revenue"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  // Same reasoning as the analytics chart: the revenue series
                  // must paint whether or not an animation frame runs.
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target pace"
                  stroke={CHART_COLORS.reference}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs">
            <span className="flex items-center gap-2 text-ink-muted">
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: CHART_COLORS.accent }}
                aria-hidden
              />
              Revenue, cumulative
            </span>
            <span className="flex items-center gap-2 text-ink-subtle">
              <span
                className="h-0 w-4 border-t border-dashed"
                style={{ borderColor: CHART_COLORS.reference }}
                aria-hidden
              />
              Target pace
            </span>
            {/* No pace verdict here: this range is not the analytical period,
                and Target Progress owns that judgement. */}
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-6 border-0"
          icon={<LineChart className="size-4" />}
          title="No revenue in this range"
          description="No deals were won in the selected range. Try a wider range or clear the sales rep filter."
        />
      )}
    </Panel>
  )
}
