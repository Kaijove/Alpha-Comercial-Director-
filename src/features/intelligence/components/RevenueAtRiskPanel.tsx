import { ShieldCheck } from 'lucide-react'
import { STAGE_LABELS } from '@/domain/commerce'
import { HEALTH_BAND_LABELS } from '@/domain/intelligence/opportunityScoring'
import type { RevenueAtRiskReport } from '@/domain/intelligence/riskRules'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

const bandTone: Record<string, string> = {
  critical: 'text-negative',
  'at-risk': 'text-negative',
  attention: 'text-warning',
  healthy: 'text-positive',
}

/**
 * Revenue at Risk.
 *
 * The methodology is printed under the figure on purpose: a number this
 * consequential should not require the reader to trust it blindly, and stating
 * "each deal counted once, at weighted value" is what makes it checkable.
 */
export function RevenueAtRiskPanel({
  report,
  ownerName,
  customerName,
  onOpenOpportunity,
}: {
  report: RevenueAtRiskReport
  ownerName: (id: string) => string
  customerName: (id: string) => string
  onOpenOpportunity: (id: string) => void
}) {
  const fmt = useFormatters()

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Revenue at Risk"
          description="What the forecast stands to lose if the current risks are not addressed."
        />
        <p className="tnum mt-4 text-metric-lg font-semibold leading-none tracking-tight text-negative">
          {fmt.currency(report.total)}
        </p>
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-subtle">
          {report.methodology}
        </p>
      </div>

      {report.entries.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<ShieldCheck className="size-4" />}
            title="Nothing is flagged at risk"
            description="Every open deal scores above the At risk health threshold."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[900px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-[0.1em] text-ink-subtle">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">
                  Opportunity
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Value
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Prob.
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Expected close
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Risk
                </th>
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  Primary reason
                </th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">
                  At risk
                </th>
              </tr>
            </thead>
            <tbody>
              {report.entries.slice(0, 12).map((entry) => {
                const { opportunity, scored } = entry
                return (
                  <tr
                    key={opportunity.id}
                    tabIndex={0}
                    onClick={() => onOpenOpportunity(opportunity.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onOpenOpportunity(opportunity.id)
                      }
                    }}
                    className="cursor-pointer border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated focus-visible:bg-elevated"
                  >
                    <td className="max-w-[240px] px-5 py-3">
                      <span className="block truncate text-ink">
                        {customerName(opportunity.customerId)}
                      </span>
                      <span className="block truncate text-2xs text-ink-faint">
                        {opportunity.name} · {STAGE_LABELS[opportunity.stage]} ·{' '}
                        {ownerName(opportunity.ownerId)}
                      </span>
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink">
                      {fmt.currency(opportunity.value)}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {Math.round(opportunity.probability * 100)}%
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {fmt.shortDate(opportunity.expectedCloseDate)}
                      <span className="ml-1.5 text-2xs text-ink-faint">
                        {scored.health.daysToClose < 0
                          ? `${Math.abs(scored.health.daysToClose)}d late`
                          : `${scored.health.daysToClose}d`}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'font-medium',
                          bandTone[scored.health.band] ?? 'text-ink-muted',
                        )}
                      >
                        {HEALTH_BAND_LABELS[scored.health.band]}
                      </span>
                      <span className="tnum ml-1.5 text-2xs text-ink-faint">
                        {scored.health.score}/100
                      </span>
                    </td>
                    <td className="max-w-[280px] px-3 py-3">
                      <span className="block truncate text-ink-muted" title={entry.primaryReason}>
                        {entry.primaryReason}
                      </span>
                      <span
                        className="block truncate text-2xs text-ink-faint"
                        title={entry.recommendation}
                      >
                        {entry.recommendation}
                      </span>
                    </td>
                    <td className="tnum px-5 py-3 text-right font-medium text-negative">
                      {fmt.currency(entry.amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {report.entries.length > 12 ? (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-faint sm:px-6">
          Showing the 12 largest exposures of {report.entries.length}.
        </p>
      ) : null}
    </Panel>
  )
}
