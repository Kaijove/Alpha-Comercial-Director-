import {
  ACTIVITY_LABELS,
  STAGES,
  STAGE_LABELS,
  daysSince,
  type Opportunity,
  type Stage,
} from '@/domain/commerce'
import { assessOpportunityRisk, RISK_LABELS, type RiskLevel } from '@/domain/risk/riskEngine'
import { weightedValue } from '@/domain/metrics/primitives'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { controlBase, controlTone } from '@/components/ui/Field'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { Pencil, Trash2 } from 'lucide-react'

const riskTone: Record<RiskLevel, string> = {
  healthy: 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-body">
      <dt className="shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink">{value}</dd>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  )
}

/**
 * Deal detail.
 *
 * Also the accessible route for moving a deal: the stage control here works
 * with a keyboard and on touch, where dragging a card does not.
 */
export function DealDetailPanel({
  opportunity,
  now,
  onClose,
  onEdit,
  onDelete,
  onMove,
}: {
  opportunity: Opportunity | null
  now: Date
  onClose: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, stage: Stage) => void
}) {
  const { customerById, ownerById, activitiesFor } = useCommercialData()
  const fmt = useFormatters()

  if (!opportunity) return null

  const customer = customerById(opportunity.customerId)
  const owner = ownerById(opportunity.ownerId)
  const risk = assessOpportunityRisk(opportunity, now)
  const daysInStage = daysSince(opportunity.stageEnteredAt, now)
  const closed = opportunity.stage === 'won' || opportunity.stage === 'lost'

  const timeline = [
    ...opportunity.stageHistory.map((event) => ({
      id: `stage-${event.stage}-${event.at}`,
      at: event.at,
      title: `Entered ${STAGE_LABELS[event.stage]}`,
      kind: 'stage' as const,
    })),
    ...activitiesFor(opportunity.id).map((activity) => ({
      id: activity.id,
      at: activity.at,
      title: `${ACTIVITY_LABELS[activity.type]} — ${activity.summary}`,
      kind: 'activity' as const,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <Drawer
      open
      onClose={onClose}
      title={customer?.name ?? 'Unknown account'}
      description={opportunity.name}
      footer={
        <>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onDelete(opportunity.id)}
            iconLeft={<Trash2 className="size-3.5" />}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onEdit(opportunity.id)}
            iconLeft={<Pencil className="size-3.5" />}
          >
            Edit opportunity
          </Button>
        </>
      }
    >
      <div className="space-y-7">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <p className="tnum text-metric-lg font-semibold leading-none tracking-tight text-ink">
              {fmt.currency(opportunity.value)}
            </p>
            <span className={cn('text-body font-medium', riskTone[risk.level])}>
              {closed ? STAGE_LABELS[opportunity.stage] : RISK_LABELS[risk.level]}
            </span>
          </div>
          <p className="mt-1.5 text-body text-ink-muted">
            {fmt.currency(weightedValue(opportunity))} weighted at{' '}
            {Math.round(opportunity.probability * 100)}% probability
          </p>
          {!closed ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">{risk.reason}</p>
          ) : null}
        </section>

        <section className="space-y-2.5">
          <SectionTitle>Stage</SectionTitle>
          <select
            aria-label="Move to stage"
            value={opportunity.stage}
            onChange={(event) => onMove(opportunity.id, event.target.value as Stage)}
            className={cn(controlBase, controlTone(false), 'h-10 w-full appearance-none pr-9')}
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage} className="bg-elevated text-ink">
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-faint">
            {daysInStage === 0
              ? 'Entered this stage today'
              : `${daysInStage} ${daysInStage === 1 ? 'day' : 'days'} in this stage`}
            {opportunity.probabilityIsManual
              ? ' · probability was set by hand and is kept through stage changes'
              : ''}
          </p>
        </section>

        <section className="space-y-1">
          <SectionTitle>Overview</SectionTitle>
          <dl className="divide-y divide-line-soft">
            <Row label="Customer" value={customer?.name ?? '—'} />
            <Row
              label="Owner"
              value={
                owner ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar
                      initials={repInitials(owner.name)}
                      accent={owner.accent}
                      size="sm"
                      className="size-5 text-2xs"
                    />
                    {owner.name}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Row
              label="Expected close"
              value={fmt.date(opportunity.expectedCloseDate, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            />
            <Row
              label="Probability"
              value={`${Math.round(opportunity.probability * 100)}%`}
            />
          </dl>
        </section>

        <section className="space-y-1">
          <SectionTitle>Commercial information</SectionTitle>
          <dl className="divide-y divide-line-soft">
            <Row label="Product" value={opportunity.product || '—'} />
            <Row label="Source" value={opportunity.source || '—'} />
            <Row label="Region" value={opportunity.region || '—'} />
            <Row label="Created" value={fmt.date(opportunity.createdAt)} />
            <Row
              label="Last activity"
              value={
                risk.inactiveDays === 0 ? 'Today' : `${risk.inactiveDays} days ago`
              }
            />
            <Row label="Days in stage" value={`${daysInStage}`} />
          </dl>
        </section>

        {opportunity.notes ? (
          <section className="space-y-2">
            <SectionTitle>Notes</SectionTitle>
            <p className="whitespace-pre-line rounded-field border border-line bg-elevated p-3 text-body leading-relaxed text-ink-muted">
              {opportunity.notes}
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <SectionTitle>Activity</SectionTitle>
          {timeline.length === 0 ? (
            <p className="text-xs text-ink-faint">No activity recorded.</p>
          ) : (
            <ol className="relative space-y-3 border-l border-line pl-4">
              {timeline.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[21px] top-1.5 size-1.5 rounded-full',
                      entry.kind === 'stage' ? 'bg-accent' : 'bg-line-strong',
                    )}
                    aria-hidden
                  />
                  <p className="text-body leading-snug text-ink-muted">{entry.title}</p>
                  <p className="text-2xs text-ink-faint">
                    {fmt.date(entry.at, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Drawer>
  )
}
