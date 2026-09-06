import { useMemo, useState } from 'react'
import { Pencil, UserMinus } from 'lucide-react'
import {
  ACTIVITY_LABELS,
  OPEN_STAGES,
  STAGE_LABELS,
  daysSince,
  isOpen,
  type Opportunity,
} from '@/domain/commerce'
import { ACTIVITY_BREAKDOWN, repStageSplit } from '@/domain/metrics/teamMetrics'
import { weightedValue } from '@/domain/metrics/primitives'
import { assessOpportunityRisk, RISK_LABELS, RISK_ORDER, type RiskLevel } from '@/domain/risk/riskEngine'
import { PERFORMANCE_LABELS, type PerformanceStatus } from '@/domain/team/teamPerformanceEngine'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { repInitials } from '@/domain/workspace'
import { useFormatters } from '@/hooks/useFormatters'
import { useSortable } from '@/hooks/useSortable'
import { cn } from '@/lib/cn'
import type { RepRow } from '../useTeamData'

const statusTone: Record<PerformanceStatus, string> = {
  'on-track': 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
  'no-data': 'text-ink-faint',
}

const riskTone: Record<RiskLevel, string> = {
  healthy: 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
}

type OppColumn = 'value' | 'probability' | 'close' | 'risk'

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

/** Everything about one rep, without leaving the team view. */
export function RepDetailPanel({
  row,
  now,
  periodLabel,
  onClose,
  onEdit,
  onRemove,
  onOpenOpportunity,
}: {
  row: RepRow | null
  now: Date
  periodLabel: string
  onClose: () => void
  onEdit: (ownerId: string) => void
  onRemove: (ownerId: string) => void
  onOpenOpportunity: (id: string) => void
}) {
  const { dataset, customerById } = useCommercialData()
  const fmt = useFormatters()
  const [sortKey, setSortKey] = useState<OppColumn>('value')

  const owned = useMemo(
    () =>
      row
        ? dataset.opportunities.filter(
            (opportunity) => opportunity.ownerId === row.owner.id && isOpen(opportunity),
          )
        : [],
    [dataset.opportunities, row],
  )

  const { sorted } = useSortable<Opportunity, OppColumn>(
    owned,
    {
      value: (o) => o.value,
      probability: (o) => o.probability,
      close: (o) => -new Date(o.expectedCloseDate).getTime(),
      risk: (o) => -RISK_ORDER[assessOpportunityRisk(o, now).level],
    },
    { key: sortKey, direction: 'desc' },
  )

  const stages = useMemo(
    () => (row ? repStageSplit(dataset.opportunities, row.owner.id, OPEN_STAGES) : []),
    [dataset.opportunities, row],
  )

  if (!row) return null

  const maxStage = Math.max(1, ...stages.map((stage) => stage.value))

  return (
    <Drawer
      open
      onClose={onClose}
      title={row.owner.name}
      description={row.owner.role}
      footer={
        <>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onRemove(row.owner.id)}
            iconLeft={<UserMinus className="size-3.5" />}
          >
            Remove
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onEdit(row.owner.id)}
            iconLeft={<Pencil className="size-3.5" />}
          >
            Edit rep
          </Button>
        </>
      }
    >
      <div className="space-y-7">
        <section>
          <div className="flex items-center gap-3">
            <Avatar
              initials={repInitials(row.owner.name)}
              accent={row.owner.accent}
              size="lg"
            />
            <div className="min-w-0">
              <p className="tnum text-metric font-semibold leading-none tracking-tight text-ink">
                {fmt.currency(row.revenue)}
              </p>
              <p className="mt-1 text-body text-ink-muted">
                of {fmt.currency(row.target)} {periodLabel.toLowerCase()} target
              </p>
            </div>
            <span
              className={cn(
                'ml-auto shrink-0 text-body font-medium',
                statusTone[row.performance.status],
              )}
            >
              {PERFORMANCE_LABELS[row.performance.status]}
            </span>
          </div>

          {row.performance.weakest ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
              {row.performance.weakest.detail}
            </p>
          ) : null}
        </section>

        <section className="space-y-1">
          <SectionTitle>Overview</SectionTitle>
          <dl className="divide-y divide-line-soft">
            <Row
              label="Attainment"
              value={row.attainment !== null ? fmt.percent(row.attainment, 0) : '—'}
            />
            <Row label="Remaining" value={fmt.currency(row.remaining)} />
            <Row label="Open pipeline" value={fmt.currency(row.pipeline)} />
            <Row label="Weighted pipeline" value={fmt.currency(row.weightedPipeline)} />
            <Row
              label="Coverage"
              value={
                row.coverage === null
                  ? 'Target covered'
                  : `${fmt.number(row.coverage, 1)}x`
              }
            />
            <Row
              label="Win rate"
              value={row.winRate !== null ? fmt.percent(row.winRate, 0) : '—'}
            />
            <Row
              label="Average deal size"
              value={
                row.averageDealSize !== null ? fmt.currency(row.averageDealSize) : '—'
              }
            />
            <Row
              label="Sales cycle"
              value={
                row.salesCycle.average !== null
                  ? `${fmt.number(row.salesCycle.average, 0)} days (median ${fmt.number(row.salesCycle.median ?? 0, 0)})`
                  : '—'
              }
            />
          </dl>
        </section>

        <section className="space-y-2">
          <SectionTitle>Performance trend</SectionTitle>
          <div className="rounded-field border border-line bg-elevated p-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="tnum text-section font-semibold tracking-tight text-ink">
                  {fmt.currency(row.revenue)}
                </p>
                <p className="text-xs text-ink-faint">this period</p>
              </div>
              <div className="text-right">
                <p className="tnum text-section font-semibold tracking-tight text-ink-muted">
                  {fmt.currency(row.previousRevenue)}
                </p>
                <p className="text-xs text-ink-faint">previous period</p>
              </div>
            </div>
            <p
              className={cn(
                'mt-3 border-t border-line pt-3 text-body',
                (row.revenueDelta ?? 0) >= 0 ? 'text-positive' : 'text-negative',
              )}
            >
              {row.revenueDelta === null
                ? 'No comparable previous period.'
                : `${row.revenueDelta >= 0 ? '+' : ''}${fmt.number(row.revenueDelta * 100, 1)}% against the previous period (${fmt.signed(row.revenue - row.previousRevenue)}).`}
            </p>
          </div>
        </section>

        <section className="space-y-2.5">
          <SectionTitle>Pipeline</SectionTitle>
          <p className="text-xs text-ink-faint">
            {row.openCount} open {row.openCount === 1 ? 'opportunity' : 'opportunities'} ·{' '}
            {fmt.currency(row.pipeline)} · {fmt.currency(row.weightedPipeline)} weighted
          </p>
          <ul className="space-y-2">
            {stages.map((stage) => (
              <li key={stage.stage} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="text-ink-muted">{STAGE_LABELS[stage.stage]}</span>
                  <span className="tnum text-ink-faint">
                    {stage.count} · {fmt.currency(stage.value)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent/55"
                    style={{ width: `${(stage.value / maxStage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1">
          <SectionTitle>Activity</SectionTitle>
          <dl className="divide-y divide-line-soft">
            {ACTIVITY_BREAKDOWN.map((type) => (
              <Row key={type} label={ACTIVITY_LABELS[type]} value={`${row.activity[type]}`} />
            ))}
            <Row label="Total activities" value={`${row.activity.total}`} />
            <Row
              label="Last activity"
              value={
                row.lastActivityAt
                  ? daysSince(row.lastActivityAt, now) === 0
                    ? 'Today'
                    : `${daysSince(row.lastActivityAt, now)} days ago`
                  : 'No activity recorded'
              }
            />
          </dl>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>Opportunities</SectionTitle>
            <SegmentedControl
              value={sortKey}
              onChange={setSortKey}
              options={[
                { value: 'value', label: 'Value' },
                { value: 'probability', label: 'Prob.' },
                { value: 'close', label: 'Close' },
                { value: 'risk', label: 'Risk' },
              ]}
            />
          </div>

          {sorted.length === 0 ? (
            <p className="text-xs text-ink-faint">No open opportunities.</p>
          ) : (
            <ul className="divide-y divide-line-soft rounded-field border border-line">
              {sorted.slice(0, 8).map((opportunity) => {
                const risk = assessOpportunityRisk(opportunity, now)
                return (
                  <li key={opportunity.id}>
                    <button
                      type="button"
                      onClick={() => onOpenOpportunity(opportunity.id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-elevated"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-ink">
                          {customerById(opportunity.customerId)?.name ?? 'Unknown account'}
                        </span>
                        <span className="block truncate text-2xs text-ink-faint">
                          {STAGE_LABELS[opportunity.stage]} ·{' '}
                          {Math.round(opportunity.probability * 100)}% ·{' '}
                          {fmt.shortDate(opportunity.expectedCloseDate)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block text-body font-medium text-ink">
                          {fmt.currency(opportunity.value)}
                        </span>
                        <span
                          className={cn('block text-2xs', riskTone[risk.level])}
                          title={risk.reason}
                        >
                          {RISK_LABELS[risk.level]} ·{' '}
                          {fmt.currency(weightedValue(opportunity))}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  )
}
