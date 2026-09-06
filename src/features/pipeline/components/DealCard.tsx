import { GripVertical } from 'lucide-react'
import { STAGE_LABELS, type Opportunity } from '@/domain/commerce'
import { assessOpportunityRisk, type RiskLevel } from '@/domain/risk/riskEngine'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { Avatar } from '@/components/ui/Avatar'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

const riskDot: Record<RiskLevel, string> = {
  healthy: 'bg-positive',
  attention: 'bg-warning',
  'at-risk': 'bg-negative',
}

/**
 * A deal, compact enough to scan a column but complete enough to act on:
 * account, deal, value, stage and probability, close date, owner, how long it
 * has been quiet, and its risk level.
 */
export function DealCard({
  opportunity,
  now,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging,
}: {
  opportunity: Opportunity
  now: Date
  onOpen: (id: string) => void
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  dragging?: boolean
}) {
  const { customerById, ownerById } = useCommercialData()
  const fmt = useFormatters()

  const customer = customerById(opportunity.customerId)
  const owner = ownerById(opportunity.ownerId)
  const risk = assessOpportunityRisk(opportunity, now)
  const closed = opportunity.stage === 'won' || opportunity.stage === 'lost'

  return (
    <article
      draggable={!closed}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', opportunity.id)
        event.dataTransfer.effectAllowed = 'move'
        onDragStart?.(opportunity.id)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative rounded-field border border-line bg-elevated p-3 transition-[border-color,background-color,opacity] duration-150',
        'hover:border-line-strong hover:bg-raised',
        !closed && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(opportunity.id)}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-ink">
              {customer?.name ?? 'Unknown account'}
            </p>
            <p className="truncate text-xs text-ink-subtle">{opportunity.name}</p>
          </div>
          {!closed ? (
            <GripVertical
              className="mt-0.5 size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
          ) : null}
        </div>

        <p className="tnum mt-2.5 text-title font-semibold tracking-tight text-ink">
          {fmt.currency(opportunity.value)}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
          <span>{STAGE_LABELS[opportunity.stage]}</span>
          <span aria-hidden>·</span>
          <span className="tnum">{Math.round(opportunity.probability * 100)}%</span>
          {opportunity.probabilityIsManual ? (
            <span
              className="text-ink-faint"
              title="Probability was set by hand and is kept through stage changes"
            >
              (manual)
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-soft pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {owner ? (
              <Avatar
                initials={repInitials(owner.name)}
                accent={owner.accent}
                size="sm"
                className="size-5 text-2xs"
              />
            ) : null}
            <span className="truncate text-xs text-ink-faint">
              {fmt.shortDate(opportunity.expectedCloseDate)}
            </span>
          </div>

          <span
            className="flex items-center gap-1.5 text-xs text-ink-faint"
            title={risk.reason}
          >
            {risk.inactiveDays === 0 ? 'active today' : `${risk.inactiveDays}d quiet`}
            <span
              className={cn('size-1.5 rounded-full', riskDot[risk.level])}
              aria-label={risk.reason}
            />
          </span>
        </div>
      </button>
    </article>
  )
}
