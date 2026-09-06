import { useMemo, useState } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { generatePerformanceInsights } from '@/domain/insights/analyticsEngine'
import { computeAnalyticsMetrics } from '@/domain/metrics/analyticsMetrics'
import {
  dailyTargetOf,
  resolveAnalyticsPeriod,
  type AnalyticsRangeKey,
  type CustomRange,
} from '@/domain/metrics/ranges'
import { allowedGranularities, revenueTrend, type Granularity } from '@/domain/metrics/trend'
import { useFormatters } from '@/hooks/useFormatters'

export interface AnalyticsFilterState {
  range: AnalyticsRangeKey
  custom: CustomRange
  ownerId: string | null
}

function defaultCustomRange(now: Date): CustomRange {
  const iso = (date: Date) => date.toISOString().slice(0, 10)
  const start = new Date(now)
  start.setDate(start.getDate() - 59)
  return { start: iso(start), end: iso(now) }
}

/**
 * One derivation pass for the Analytics page.
 *
 * Metrics, trend series and insights are memoised together so every widget
 * reads the same snapshot and heavy work is not repeated per component.
 */
export function useAnalyticsData() {
  const workspace = useReadyWorkspace()
  const { dataset } = useCommercialData()
  const fmt = useFormatters()

  // Pinned per mount so the page does not shift under the user mid-session.
  const now = useMemo(() => new Date(), [])

  const [filters, setFilters] = useState<AnalyticsFilterState>(() => ({
    range: '90d',
    custom: defaultCustomRange(now),
    ownerId: null,
  }))

  const period = useMemo(
    () => resolveAnalyticsPeriod(filters.range, workspace.goals, now, filters.custom),
    [filters.range, filters.custom, workspace.goals, now],
  )

  const metrics = useMemo(
    () => computeAnalyticsMetrics(dataset, workspace, period, filters.ownerId),
    [dataset, workspace, period, filters.ownerId],
  )

  const granularities = useMemo(() => allowedGranularities(period.days), [period.days])
  const [granularity, setGranularity] = useState<Granularity>('weekly')
  const effectiveGranularity = granularities.includes(granularity)
    ? granularity
    : granularities[0]

  const dailyTarget = useMemo(() => {
    const base = dailyTargetOf(workspace.goals)
    return filters.ownerId && dataset.owners.length > 0
      ? base / dataset.owners.length
      : base
  }, [workspace.goals, filters.ownerId, dataset.owners.length])

  const trend = useMemo(
    () =>
      revenueTrend(metrics.scoped, period, effectiveGranularity, dailyTarget, fmt.locale),
    [metrics.scoped, period, effectiveGranularity, dailyTarget, fmt.locale],
  )

  const insights = useMemo(
    () =>
      generatePerformanceInsights(metrics, {
        currency: fmt.currency,
        percent: fmt.percent,
        points: fmt.points,
        number: fmt.number,
      }),
    [metrics, fmt],
  )

  return {
    now,
    filters,
    setFilters,
    period,
    metrics,
    trend,
    insights,
    granularity: effectiveGranularity,
    setGranularity,
    granularities,
    dataset,
  }
}
