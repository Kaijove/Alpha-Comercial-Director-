import { Layers } from 'lucide-react'
import { STAGE_LABELS, type Opportunity } from '@/domain/commerce'
import { assessOpportunityRisk, type RiskLevel } from '@/domain/risk/riskEngine'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { repInitials } from '@/domain/workspace'
import { cn } from '@/lib/cn'

const riskDot: Record<RiskLevel, string> = {
  healthy: 'bg-positive',
  attention: 'bg-warning',
  'at-risk': 'bg-negative',
}

/**
 * The deals that most deserve the director's attention, ranked by weighted
 * value so a large improbable deal never outranks a smaller certain one.
 */
export function TopOpportunities({
  opportunities,
  now,
}: {
  opportunities: Opportunity[]
  now: Date
}) {
  const { customerById, ownerById } = useCommercialData()
  const fmt = useFormatters()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Top Opportunities"
          description="Ranked by weighted value: what is worth the most once probability is taken into account."
        />
      </div>

      {opportunities.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Layers className="size-4" />}
            title="No open opportunities"
            description="Nothing matches the current filters."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {opportunities.map((opportunity) => {
            const customer = customerById(opportunity.customerId)
            const owner = ownerById(opportunity.ownerId)
            const risk = assessOpportunityRisk(opportunity, now)

            return (
              <li
                key={opportunity.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors duration-150 hover:bg-elevated sm:gap-4 sm:px-6"
              >
                <span
                  className={cn('size-1.5 shrink-0 rounded-full', riskDot[risk.level])}
                  title={risk.reason}
                  aria-label={risk.reason}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">
                    {customer?.name ?? 'Unknown account'}
                  </p>
                  <p className="truncate text-xs text-ink-subtle">{opportunity.name}</p>
                </div>

                <div className="hidden w-28 shrink-0 sm:block">
                  <p className="text-xs text-ink-muted">{STAGE_LABELS[opportunity.stage]}</p>
                  <p className="tnum text-xs text-ink-faint">
                    {Math.round(opportunity.probability * 100)}% probability
                  </p>
                </div>

                <div className="hidden w-24 shrink-0 text-right md:block">
                  <p className="text-xs text-ink-muted">
                    {fmt.shortDate(opportunity.expectedCloseDate)}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {risk.daysToClose < 0
                      ? `${Math.abs(risk.daysToClose)}d overdue`
                      : `in ${risk.daysToClose}d`}
                  </p>
                </div>

                <div className="w-24 shrink-0 text-right">
                  <p className="tnum text-sm font-semibold text-ink">
                    {fmt.currency(opportunity.value)}
                  </p>
                  <p className="tnum text-xs text-ink-faint">
                    {fmt.currency(opportunity.value * opportunity.probability)} weighted
                  </p>
                </div>

                {owner ? (
                  <Avatar
                    initials={repInitials(owner.name)}
                    accent={owner.accent}
                    size="sm"
                    className="hidden shrink-0 lg:inline-flex"
                  />
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
