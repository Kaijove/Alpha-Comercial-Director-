import { Layers } from 'lucide-react'
import { STAGE_LABELS, type Opportunity } from '@/domain/commerce'
import { assessOpportunityRisk, RISK_LABELS, RISK_ORDER, type RiskLevel } from '@/domain/risk/riskEngine'
import { weightedValue } from '@/domain/metrics/primitives'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel } from '@/components/ui/Panel'
import { SortHeader } from '@/components/composite/SortHeader'
import { useFormatters } from '@/hooks/useFormatters'
import { useSortable } from '@/hooks/useSortable'
import { cn } from '@/lib/cn'

type Column =
  | 'name'
  | 'customer'
  | 'owner'
  | 'stage'
  | 'value'
  | 'probability'
  | 'weighted'
  | 'close'
  | 'activity'
  | 'risk'

const riskTone: Record<RiskLevel, string> = {
  healthy: 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
}

/**
 * The detailed view. Sorting is client-side over the already-filtered set, so
 * it stays responsive with a large pipeline and always agrees with the board.
 */
export function PipelineTable({
  opportunities,
  now,
  onOpen,
}: {
  opportunities: Opportunity[]
  now: Date
  onOpen: (id: string) => void
}) {
  const { customerById, ownerById } = useCommercialData()
  const fmt = useFormatters()

  const { sorted, sort, toggle } = useSortable<Opportunity, Column>(
    opportunities,
    {
      name: (o) => o.name,
      customer: (o) => customerById(o.customerId)?.name ?? '',
      owner: (o) => ownerById(o.ownerId)?.name ?? '',
      stage: (o) => STAGE_LABELS[o.stage],
      value: (o) => o.value,
      probability: (o) => o.probability,
      weighted: (o) => weightedValue(o),
      close: (o) => new Date(o.expectedCloseDate).getTime(),
      activity: (o) => new Date(o.lastActivityAt).getTime(),
      risk: (o) => RISK_ORDER[assessOpportunityRisk(o, now).level],
    },
    { key: 'weighted', direction: 'desc' },
  )

  if (opportunities.length === 0) {
    return (
      <Panel>
        <EmptyState
          className="border-0"
          icon={<Layers className="size-4" />}
          title="No opportunities match your filters"
          description="Adjust or clear the filters to see the rest of the pipeline."
        />
      </Panel>
    )
  }

  return (
    <Panel flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-body">
          <thead>
            <tr className="border-b border-line">
              <SortHeader label="Opportunity" columnKey="name" align="left" active={sort.key === 'name'} direction={sort.direction} onSort={toggle} className="px-5 py-2.5" />
              <SortHeader label="Customer" columnKey="customer" align="left" active={sort.key === 'customer'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Owner" columnKey="owner" align="left" active={sort.key === 'owner'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Stage" columnKey="stage" align="left" active={sort.key === 'stage'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Value" columnKey="value" active={sort.key === 'value'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Prob." columnKey="probability" active={sort.key === 'probability'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Weighted" columnKey="weighted" active={sort.key === 'weighted'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Expected close" columnKey="close" active={sort.key === 'close'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Last activity" columnKey="activity" active={sort.key === 'activity'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
              <SortHeader label="Risk" columnKey="risk" active={sort.key === 'risk'} direction={sort.direction} onSort={toggle} className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((opportunity) => {
              const risk = assessOpportunityRisk(opportunity, now)
              const closed =
                opportunity.stage === 'won' || opportunity.stage === 'lost'

              return (
                <tr
                  key={opportunity.id}
                  onClick={() => onOpen(opportunity.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpen(opportunity.id)
                    }
                  }}
                  className="cursor-pointer border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated focus-visible:bg-elevated"
                >
                  <td className="max-w-[220px] px-5 py-3">
                    <span className="block truncate text-ink">{opportunity.name}</span>
                    <span className="block truncate text-2xs text-ink-faint">
                      {opportunity.product}
                    </span>
                  </td>
                  <td className="max-w-[180px] px-3 py-3">
                    <span className="block truncate text-ink-muted">
                      {customerById(opportunity.customerId)?.name ?? '—'}
                    </span>
                  </td>
                  <td className="max-w-[140px] px-3 py-3">
                    <span className="block truncate text-ink-muted">
                      {ownerById(opportunity.ownerId)?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    {STAGE_LABELS[opportunity.stage]}
                  </td>
                  <td className="tnum px-3 py-3 text-right font-medium text-ink">
                    {fmt.currency(opportunity.value)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {Math.round(opportunity.probability * 100)}%
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {fmt.currency(weightedValue(opportunity))}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {fmt.shortDate(opportunity.expectedCloseDate)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-muted">
                    {risk.inactiveDays === 0 ? 'Today' : `${risk.inactiveDays}d ago`}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {closed ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <span className={cn('font-medium', riskTone[risk.level])} title={risk.reason}>
                        {RISK_LABELS[risk.level]}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
