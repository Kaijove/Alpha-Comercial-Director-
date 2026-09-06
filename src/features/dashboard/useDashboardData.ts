import { useMemo } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { useIntelligence } from '@/features/intelligence/useIntelligence'
import type { DashboardFilterState } from './components/DashboardFilters'

/**
 * One derivation pass for the whole dashboard.
 *
 * Health and Today's Focus come from the same intelligence engine the
 * Commercial Intelligence page runs, so the two screens can never recommend
 * different things or disagree about how the business is doing.
 */
export function useDashboardData(filters: DashboardFilterState) {
  const workspace = useReadyWorkspace()
  const { dataset } = useCommercialData()

  // Pinned per mount: the dashboard must not shift under the user mid-session.
  const now = useMemo(() => new Date(), [])

  const period = useMemo(() => resolvePeriod(filters.period, now), [filters.period, now])

  const metrics = useMemo(
    () => computeCommercialMetrics(dataset, workspace, period, filters.ownerId),
    [dataset, workspace, period, filters.ownerId],
  )

  const intelligence = useIntelligence(metrics, now)

  // The five highest-priority live signals; low-severity noise stays on the
  // Intelligence page rather than competing for the morning read.
  const focus = useMemo(
    () =>
      intelligence.insights
        .filter(
          (insight) =>
            insight.status !== 'resolved' &&
            insight.status !== 'dismissed' &&
            insight.severity !== 'low',
        )
        .slice(0, 5),
    [intelligence.insights],
  )

  return {
    now,
    period,
    metrics,
    health: intelligence.health,
    focus,
    intelligence,
    dataset,
  }
}
