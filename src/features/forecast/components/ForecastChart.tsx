import { useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Opportunity } from '@/domain/commerce'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import {
  buildForecastSeries,
  GRANULARITY_OPTIONS,
  type ForecastGranularity,
} from '@/domain/forecast/forecastSeries'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/EmptyState'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { CHART_COLORS, axisProps, gridProps } from '@/components/charts/chartTheme'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * Actual revenue, then the projection.
 *
 * Solid bars are money that arrived. The dashed line is a projection and is
 * drawn in a different shape, not merely a different colour, so the boundary
 * survives a greyscale print and a colour-blind reader alike.
 */
export function ForecastChart({
  opportunities,
  metrics,
}: {
  opportunities: Opportunity[]
  metrics: CommercialMetrics
}) {
  const fmt = useFormatters()
  const [granularity, setGranularity] = useState<ForecastGranularity>('month')
  const forecast = metrics.forecast

  const bucketTarget = useMemo(() => {
    if (metrics.target <= 0) return null
    // The target is expressed for the period in view; scale it to the bucket
    // the chart is drawing rather than inventing a second target definition.
    const days = metrics.period.totalDays
    const perDay = metrics.target / days
    return granularity === 'month'
      ? perDay * 30.44
      : granularity === 'quarter'
        ? perDay * 91.3
        : perDay * 365
  }, [metrics.target, metrics.period.totalDays, granularity])

  const data = useMemo(
    () =>
      buildForecastSeries({
        opportunities,
        granularity,
        now: metrics.period.now,
        locale: fmt.locale,
        forecast: forecast.value,
        best: forecast.scenarios.best.value,
        worst: forecast.scenarios.worst.value,
        bucketTarget,
      }),
    [opportunities, granularity, metrics.period.now, fmt.locale, forecast, bucketTarget],
  )

  const hasHistory = data.some((point) => (point.actual ?? 0) > 0)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Revenue Forecast"
        description={`Solid bars are revenue already won. The dashed line is the projection for ${metrics.period.label}, with the best and worst cases around it.`}
        action={
          <SegmentedControl
            value={granularity}
            onChange={setGranularity}
            options={GRANULARITY_OPTIONS}
          />
        }
      />

      {hasHistory ? (
        <>
          <div className="-ml-2 mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={62} tickFormatter={(value) => fmt.compact(Number(value))} />

                {bucketTarget !== null ? (
                  <ReferenceLine
                    y={bucketTarget}
                    stroke={CHART_COLORS.reference}
                    strokeDasharray="4 4"
                    label={{
                      value: 'Target',
                      position: 'insideTopRight',
                      fill: CHART_COLORS.axis,
                      fontSize: 11,
                    }}
                  />
                ) : null}

                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  content={
                    <ChartTooltip format={(value) => fmt.currency(value)} />
                  }
                />

                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill={CHART_COLORS.accent}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={38}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="worst"
                  name="Worst case"
                  stroke={CHART_COLORS.neutral}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="best"
                  name="Best case"
                  stroke={CHART_COLORS.positive}
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="forecast"
                  name="Base forecast"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: CHART_COLORS.accent, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-xs text-ink-muted">
            <Legend swatch="bar" color={CHART_COLORS.accent} label="Actual revenue" />
            <Legend swatch="dash" color={CHART_COLORS.accent} label="Base forecast" />
            <Legend swatch="dash" color={CHART_COLORS.positive} label="Best case" />
            <Legend swatch="dash" color={CHART_COLORS.neutral} label="Worst case" />
            {bucketTarget !== null ? (
              <Legend swatch="dash" color={CHART_COLORS.reference} label="Target" />
            ) : null}
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-6"
          title="No closed revenue yet"
          description="The chart draws real won deals only. It will fill in as the first deals close."
        />
      )}
    </Panel>
  )
}

function Legend({
  swatch,
  color,
  label,
}: {
  swatch: 'bar' | 'dash'
  color: string
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {swatch === 'bar' ? (
        <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} aria-hidden />
      ) : (
        <span
          className="h-0 w-4 border-t-2 border-dashed"
          style={{ borderColor: color }}
          aria-hidden
        />
      )}
      {label}
    </span>
  )
}
