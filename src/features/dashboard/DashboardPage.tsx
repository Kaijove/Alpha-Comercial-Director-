import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Database } from 'lucide-react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { DashboardFilters, type DashboardFilterState } from './components/DashboardFilters'
import { DashboardHeader } from './components/DashboardHeader'
import { KpiRow } from './components/KpiRow'
import { PipelineSnapshot } from './components/PipelineSnapshot'
import { RevenuePerformance } from './components/RevenuePerformance'
import { TargetProgress } from './components/TargetProgress'
import { TeamSnapshot } from './components/TeamSnapshot'
import { TodaysFocus } from '@/features/intelligence/components/TodaysFocus'
import { TopOpportunities } from './components/TopOpportunities'
import { useDashboardData } from './useDashboardData'

/**
 * The Executive Command Center.
 *
 * Reading order is deliberate: health and revenue against target first,
 * forecast and pipeline next, then what to act on, then the team.
 */
export function DashboardPage() {
  const workspace = useReadyWorkspace()
  const { dataset } = useCommercialData()
  const [filters, setFilters] = useState<DashboardFilterState>({
    period: 'mtd',
    ownerId: null,
  })

  const { now, period, metrics, health, focus } = useDashboardData(filters)

  // A rep-scoped view is measured against that rep's share of the commitment.
  const scopedMonthlyTarget =
    filters.ownerId && dataset.owners.length > 0
      ? workspace.goals.monthlyTarget / dataset.owners.length
      : workspace.goals.monthlyTarget

  return (
    <div className="animate-rise space-y-7">
      <DashboardHeader workspace={workspace} period={period} health={health} />

      <DashboardFilters value={filters} onChange={setFilters} owners={dataset.owners} />

      {!metrics.hasData ? (
        <EmptyState
          icon={<Database className="size-4" />}
          title="No commercial data for this selection"
          description="No opportunities are assigned to the selected sales rep. Clear the filter to see the full picture."
        />
      ) : (
        <>
          <KpiRow metrics={metrics} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RevenuePerformance
                opportunities={metrics.scopedOpportunities}
                monthlyTarget={scopedMonthlyTarget}
                now={now}
              />
            </div>
            <TargetProgress metrics={metrics} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TodaysFocus
                insights={focus}
                description="The highest-priority signals from Commercial Intelligence."
                headerAction={
                  <Link
                    to="/intelligence"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-field px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-raised hover:text-ink"
                  >
                    All intelligence
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                }
              />
            </div>
            <PipelineSnapshot metrics={metrics} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TopOpportunities opportunities={metrics.topOpportunities} now={now} />
            </div>
            <TeamSnapshot metrics={metrics} />
          </div>
        </>
      )}
    </div>
  )
}
