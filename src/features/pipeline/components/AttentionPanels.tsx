import { AlarmClock, CheckCircle2, Timer, Trophy } from 'lucide-react'
import { STAGE_LABELS, type Opportunity } from '@/domain/commerce'
import { assessOpportunityRisk, RISK_LABELS, type RiskLevel } from '@/domain/risk/riskEngine'
import { weightedValue } from '@/domain/metrics/primitives'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { useState } from 'react'

const riskTone: Record<RiskLevel, string> = {
  healthy: 'text-positive',
  attention: 'text-warning',
  'at-risk': 'text-negative',
}

function DealRow({
  opportunity,
  onOpen,
  primary,
  secondary,
}: {
  opportunity: Opportunity
  onOpen: (id: string) => void
  primary: string
  secondary: React.ReactNode
}) {
  const { customerById } = useCommercialData()
  const fmt = useFormatters()

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(opportunity.id)}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors duration-150 hover:bg-elevated"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body text-ink">
            {customerById(opportunity.customerId)?.name ?? 'Unknown account'}
          </span>
          <span className="block truncate text-xs text-ink-faint">{secondary}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="tnum block text-body font-medium text-ink">
            {fmt.currency(opportunity.value)}
          </span>
          <span className="block text-xs text-ink-faint">{primary}</span>
        </span>
      </button>
    </li>
  )
}

/** Deals that have gone quiet, ranked by how exposed they are. */
export function StalledOpportunities({
  opportunities,
  now,
  onOpen,
}: {
  opportunities: Opportunity[]
  now: Date
  onOpen: (id: string) => void
}) {
  const { ownerById } = useCommercialData()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Stalled Opportunities"
          description="Open deals with no recorded activity for twelve days or more."
        />
      </div>

      {opportunities.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<CheckCircle2 className="size-4" />}
            title="Nothing has stalled"
            description="Every open deal in this selection has recent activity."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {opportunities.slice(0, 6).map((opportunity) => {
            const risk = assessOpportunityRisk(opportunity, now)
            return (
              <DealRow
                key={opportunity.id}
                opportunity={opportunity}
                onOpen={onOpen}
                primary={`${risk.inactiveDays}d inactive`}
                secondary={
                  <>
                    {STAGE_LABELS[opportunity.stage]} ·{' '}
                    {ownerById(opportunity.ownerId)?.name ?? 'Unassigned'} ·{' '}
                    <span className={riskTone[risk.level]}>{RISK_LABELS[risk.level]}</span>
                  </>
                }
              />
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/** Deals with a close date in the next seven days, soonest first. */
export function ClosingSoon({
  opportunities,
  now,
  onOpen,
}: {
  opportunities: Opportunity[]
  now: Date
  onOpen: (id: string) => void
}) {
  const fmt = useFormatters()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Closing Soon"
          description="Expected to close within the next seven days."
        />
      </div>

      {opportunities.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<AlarmClock className="size-4" />}
            title="Nothing closing this week"
            description="No opportunity in this selection has a close date in the next seven days."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {opportunities.slice(0, 6).map((opportunity) => {
            const risk = assessOpportunityRisk(opportunity, now)
            return (
              <DealRow
                key={opportunity.id}
                opportunity={opportunity}
                onOpen={onOpen}
                primary={fmt.shortDate(opportunity.expectedCloseDate)}
                secondary={
                  <>
                    {STAGE_LABELS[opportunity.stage]} ·{' '}
                    {Math.round(opportunity.probability * 100)}% ·{' '}
                    <span className={riskTone[risk.level]}>{RISK_LABELS[risk.level]}</span>
                  </>
                }
              />
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/**
 * Biggest and best are different questions.
 *
 * A 200k deal at 20% is not more important than an 80k deal at 90%, so the
 * two rankings are offered side by side rather than merged into one list.
 */
export function TopOpportunitiesPanel({
  highestValue,
  highestProbability,
  onOpen,
}: {
  highestValue: Opportunity[]
  highestProbability: Opportunity[]
  onOpen: (id: string) => void
}) {
  const fmt = useFormatters()
  const [mode, setMode] = useState<'value' | 'weighted'>('weighted')
  const list = mode === 'value' ? highestValue : highestProbability

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4">
        <PanelHeader
          title="Top Opportunities"
          description={
            mode === 'weighted'
              ? 'Ranked by weighted value: the best opportunities, not simply the biggest.'
              : 'Ranked by face value: the largest deals, regardless of how likely they are.'
          }
          action={
            <SegmentedControl
              value={mode}
              onChange={setMode}
              options={[
                { value: 'weighted', label: 'Best' },
                { value: 'value', label: 'Largest' },
              ]}
            />
          }
        />
      </div>

      {list.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState
            className="border-0"
            icon={<Trophy className="size-4" />}
            title="No open opportunities"
            description="Nothing matches the current filters."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((opportunity) => (
            <DealRow
              key={opportunity.id}
              opportunity={opportunity}
              onOpen={onOpen}
              primary={
                mode === 'weighted'
                  ? `${fmt.currency(weightedValue(opportunity))} weighted`
                  : `${Math.round(opportunity.probability * 100)}%`
              }
              secondary={
                <span className={cn('inline-flex items-center gap-1.5')}>
                  <Timer className="size-3" aria-hidden />
                  {STAGE_LABELS[opportunity.stage]} ·{' '}
                  {fmt.shortDate(opportunity.expectedCloseDate)}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </Panel>
  )
}
