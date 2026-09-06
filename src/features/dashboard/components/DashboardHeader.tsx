import type { CommercialHealth } from '@/domain/health/commercialHealth'
import type { Period } from '@/domain/metrics/periods'
import type { Workspace } from '@/domain/workspace'
import { timeOfDayGreeting } from '@/lib/format'
import { useFormatters } from '@/hooks/useFormatters'
import { HealthIndicator } from './HealthIndicator'

export function DashboardHeader({
  workspace,
  period,
  health,
}: {
  workspace: Workspace
  period: Period
  health: CommercialHealth
}) {
  const fmt = useFormatters()

  const periodRange =
    period.key === 'ytd'
      ? String(period.start.getFullYear())
      : period.key === 'qtd'
        ? `Q${Math.floor(period.start.getMonth() / 3) + 1} ${period.start.getFullYear()}`
        : fmt.date(period.start, { month: 'long', year: 'numeric' })

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2.5">
        <h1 className="text-page font-semibold text-ink">
          {timeOfDayGreeting()}, {workspace.director.firstName}.
        </h1>
        <p className="text-sm text-ink-muted">
          Here is your commercial overview for today.
        </p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 text-xs text-ink-faint">
          <span className="font-medium text-ink-subtle">{workspace.company.name}</span>
          <span aria-hidden>/</span>
          <span>{periodRange}</span>
          <span aria-hidden>/</span>
          <span>
            Day {period.elapsedDays} of {period.totalDays}
          </span>
          <span aria-hidden>/</span>
          <span>{fmt.date(period.now, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <HealthIndicator health={health} className="shrink-0" />
    </header>
  )
}
