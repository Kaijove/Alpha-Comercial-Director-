import { useCallback, useMemo, useState } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { isOpen } from '@/domain/commerce'
import {
  CLOSED_COLUMN_DAYS,
  computePipelineMetrics,
} from '@/domain/metrics/pipelineMetrics'
import { addDays, isWithin } from '@/lib/dates'
import {
  EMPTY_PIPELINE_FILTERS,
  filterOpportunities,
  type PipelineFilterState,
} from '@/domain/pipeline/pipelineFilters'

export type PipelineView = 'kanban' | 'table'

/**
 * One derivation pass for the Pipeline page.
 *
 * Filters live here rather than inside either view, which is what lets the
 * Kanban, the table and the header totals stay in lockstep when the view is
 * switched.
 */
export function usePipelineData() {
  const workspace = useReadyWorkspace()
  const { dataset, customerById, ownerById } = useCommercialData()

  // Pinned per mount so risk and "closing soon" do not shift mid-session.
  const now = useMemo(() => new Date(), [])

  const [view, setView] = useState<PipelineView>('kanban')
  const [filters, setFilters] = useState<PipelineFilterState>(EMPTY_PIPELINE_FILTERS)
  const clearFilters = useCallback(() => setFilters(EMPTY_PIPELINE_FILTERS), [])

  const filterContext = useMemo(
    () => ({
      now,
      weekStartsOn: workspace.preferences.weekStartsOn,
      customerName: (id: string) => customerById(id)?.name ?? '',
      ownerName: (id: string) => ownerById(id)?.name ?? '',
    }),
    [now, workspace.preferences.weekStartsOn, customerById, ownerById],
  )

  /**
   * The pipeline works on what is still in play plus what closed recently.
   * Fourteen months of closed history belongs in Analytics, not on a board a
   * director is trying to work through, and including it would make the
   * "matching" count, the table and the Kanban disagree with each other.
   */
  const inScope = useMemo(() => {
    const closedFrom = addDays(now, -CLOSED_COLUMN_DAYS)
    return dataset.opportunities.filter(
      (opportunity) =>
        isOpen(opportunity) || isWithin(opportunity.closedAt, closedFrom, now),
    )
  }, [dataset.opportunities, now])

  const scoped = useMemo(
    () => filterOpportunities(inScope, filters, filterContext),
    [inScope, filters, filterContext],
  )

  const metrics = useMemo(
    () => computePipelineMetrics(scoped, dataset.opportunities, workspace, now),
    [scoped, dataset.opportunities, workspace, now],
  )

  return {
    now,
    view,
    setView,
    filters,
    setFilters,
    clearFilters,
    scoped,
    metrics,
    dataset,
  }
}
