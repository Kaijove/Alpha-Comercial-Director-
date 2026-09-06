import { useCallback, useMemo, useState } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import {
  computeRepMetrics,
  teamBenchmarks,
  type RepMetrics,
} from '@/domain/metrics/teamMetrics'
import { buildRepTargets, hasQuotaGap } from '@/domain/metrics/repTargets'
import {
  resolvePeriod,
  targetForPeriod,
  type CalendarPeriodKey,
} from '@/domain/metrics/periods'
import { pipelineValue, revenueOf, sum, winRateOf } from '@/domain/metrics/primitives'
import { closedIn, openOpportunities, wonIn } from '@/domain/metrics/primitives'
import {
  assessRepPerformance,
  PERFORMANCE_ORDER,
  type PerformanceStatus,
  type RepPerformance,
} from '@/domain/team/teamPerformanceEngine'
import {
  attentionReasons,
  generateCoachingSignals,
} from '@/domain/team/coachingEngine'
import { useFormatters } from '@/hooks/useFormatters'

export interface TeamFilterState {
  period: CalendarPeriodKey
  ownerId: string | null
  status: PerformanceStatus | 'all'
  region: string | null
}

export interface RepRow extends RepMetrics {
  performance: RepPerformance
  reasons: string[]
  region: string | null
}

/**
 * One derivation pass for the Sales Team page.
 *
 * Per-rep figures come from the shared `computeRepMetrics`, so this page cannot
 * disagree with the Dashboard or Analytics. Only the status, the coaching
 * signals and the ranking are new here.
 */
export function useTeamData() {
  const workspace = useReadyWorkspace()
  const { dataset } = useCommercialData()
  const fmt = useFormatters()

  const now = useMemo(() => new Date(), [])

  const [filters, setFilters] = useState<TeamFilterState>({
    period: 'mtd',
    ownerId: null,
    status: 'all',
    region: null,
  })
  const clearFilters = useCallback(
    () => setFilters((current) => ({ ...current, ownerId: null, status: 'all', region: null })),
    [],
  )

  const period = useMemo(() => resolvePeriod(filters.period, now), [filters.period, now])
  const periodTarget = useMemo(
    () => targetForPeriod(workspace.goals, period),
    [workspace.goals, period],
  )

  const targets = useMemo(
    () => buildRepTargets(workspace, periodTarget),
    [workspace, periodTarget],
  )

  const allReps = useMemo(
    () => computeRepMetrics(dataset, period, targets),
    [dataset, period, targets],
  )

  const benchmarks = useMemo(() => teamBenchmarks(allReps), [allReps])

  const regionOf = useCallback(
    (ownerId: string) =>
      workspace.team.find((rep) => rep.id === ownerId)?.region ?? null,
    [workspace.team],
  )

  const rows = useMemo<RepRow[]>(
    () =>
      allReps.map((rep) => ({
        ...rep,
        region: regionOf(rep.owner.id),
        performance: assessRepPerformance({
          rep,
          benchmarks,
          elapsedFraction: period.elapsedFraction,
        }),
        reasons: attentionReasons(rep, benchmarks, fmt),
      })),
    [allReps, benchmarks, period.elapsedFraction, regionOf, fmt],
  )

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (filters.ownerId && row.owner.id !== filters.ownerId) return false
        if (filters.status !== 'all' && row.performance.status !== filters.status) {
          return false
        }
        if (filters.region && row.region !== filters.region) return false
        return true
      }),
    [rows, filters],
  )

  const coaching = useMemo(
    () => generateCoachingSignals(allReps, benchmarks, fmt),
    [allReps, benchmarks, fmt],
  )

  /** Team headline figures, computed from the same primitives as everywhere. */
  const header = useMemo(() => {
    const scoped =
      filters.ownerId === null
        ? dataset.opportunities
        : dataset.opportunities.filter(
            (opportunity) => opportunity.ownerId === filters.ownerId,
          )

    const revenue = revenueOf(wonIn(scoped, period))
    const teamTarget = sum(
      filtered.map((row) => row.target),
    )

    return {
      revenue,
      teamTarget,
      attainment: teamTarget > 0 ? revenue / teamTarget : null,
      pipeline: pipelineValue(scoped),
      winRate: winRateOf(closedIn(scoped, period)),
      activeReps: filtered.filter(
        (row) => row.revenue > 0 || row.openCount > 0,
      ).length,
      totalReps: filtered.length,
      quotaGap: hasQuotaGap(workspace, periodTarget),
      commitment: periodTarget,
      openCount: openOpportunities(scoped).length,
    }
  }, [dataset.opportunities, filters.ownerId, period, filtered, workspace, periodTarget])

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          workspace.team
            .map((rep) => rep.region)
            .filter((region): region is string => Boolean(region)),
        ),
      ).sort(),
    [workspace.team],
  )

  const needsAttention = useMemo(
    () =>
      [...filtered]
        .filter((row) => row.performance.status === 'at-risk' || row.performance.status === 'attention')
        .sort(
          (a, b) =>
            PERFORMANCE_ORDER[a.performance.status] -
              PERFORMANCE_ORDER[b.performance.status] ||
            a.performance.score - b.performance.score,
        ),
    [filtered],
  )

  return {
    now,
    period,
    periodTarget,
    filters,
    setFilters,
    clearFilters,
    rows: filtered,
    allRows: rows,
    benchmarks,
    coaching,
    header,
    regions,
    needsAttention,
    dataset,
    workspace,
  }
}
