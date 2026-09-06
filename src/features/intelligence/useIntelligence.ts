import { useMemo } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useInsightStatus } from '@/app/providers/insightStatusContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { runIntelligence, type IntelligenceResult } from '@/domain/intelligence/intelligenceEngine'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * Runs the intelligence engine over an already-computed metrics snapshot.
 *
 * Takes the metrics rather than computing them so the Dashboard and the
 * Intelligence page can share one engine while each keeps its own period - and
 * so the engine can never disagree with the KPIs shown next to it.
 *
 * Memoised on the inputs: the rules are pure, so the same snapshot never has to
 * be evaluated twice.
 */
export function useIntelligence(metrics: CommercialMetrics, now: Date): IntelligenceResult {
  const workspace = useReadyWorkspace()
  const { dataset, activitiesFor, customerById, ownerById } = useCommercialData()
  const { statuses } = useInsightStatus()
  const fmt = useFormatters()

  return useMemo(
    () =>
      runIntelligence({
        dataset,
        workspace,
        metrics,
        now,
        statuses,
        fmt: {
          currency: fmt.currency,
          percent: fmt.percent,
          points: fmt.points,
          number: fmt.number,
          date: (value) => fmt.date(value),
          shortDate: (value) => fmt.shortDate(value),
        },
        activitiesFor,
        customerName: (id) => customerById(id)?.name ?? 'Unknown account',
        ownerName: (id) => ownerById(id)?.name ?? 'Unassigned',
      }),
    [
      dataset,
      workspace,
      metrics,
      now,
      statuses,
      fmt,
      activitiesFor,
      customerById,
      ownerById,
    ],
  )
}
