import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ForecastContribution, ForecastRisk } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFormatters } from '@/hooks/useFormatters'
import { BAND_TONE, MicroLabel } from './ForecastVisuals'

/**
 * Revenue already inside the forecast that is exposed.
 *
 * The health assessment here is the same one Commercial Intelligence runs, not
 * a second opinion: a deal flagged at risk on the Intelligence page is the same
 * deal, in the same band, for the same reason.
 */
export function ForecastRiskPanel({
  risk,
  onSelect,
}: {
  risk: ForecastRisk
  onSelect: (contribution: ForecastContribution) => void
}) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Forecast at Risk"
        description="Forecast revenue coming from deals that the health assessment has flagged."
        action={
          <Link
            to="/intelligence"
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Commercial Intelligence
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        }
      />

      {risk.entries.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No exposed revenue in the forecast"
          description="Every deal contributing to the forecast sits in a healthy or attention band."
        />
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-line py-4">
            <div>
              <MicroLabel>At risk</MicroLabel>
              <p className="tnum mt-1 text-metric font-semibold leading-none text-ink">
                {fmt.currency(risk.total)}
              </p>
            </div>
            <div>
              <MicroLabel>Share of projected pipeline</MicroLabel>
              <p className="tnum mt-1 text-metric font-semibold leading-none text-ink">
                {fmt.percent(risk.share, 0)}
              </p>
            </div>
            <div>
              <MicroLabel>Deals</MicroLabel>
              <p className="tnum mt-1 text-metric font-semibold leading-none text-ink">
                {risk.entries.length}
              </p>
            </div>
          </div>

          <div className="mt-5 -mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-body">
              <thead>
                <tr className="border-b border-line text-2xs uppercase tracking-[0.1em] text-ink-faint">
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Opportunity</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Health</th>
                  <th scope="col" className="px-3 py-2.5 text-right font-medium">In forecast</th>
                  <th scope="col" className="px-3 py-2.5 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {risk.entries.map((entry) => (
                  <tr
                    key={entry.contribution.opportunity.id}
                    onClick={() => onSelect(entry.contribution)}
                    className="cursor-pointer transition-colors hover:bg-elevated"
                  >
                    <td className="px-3 py-3">
                      <span className="block max-w-[220px] truncate text-ink">
                        {entry.contribution.opportunity.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {fmt.currency(entry.contribution.value)} ·{' '}
                        {fmt.percent(entry.contribution.probability, 0)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={BAND_TONE[entry.contribution.health.band]}>
                        {entry.contribution.health.score}
                      </Badge>
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink">
                      {fmt.currency(entry.atRisk)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block max-w-[280px] text-xs leading-relaxed text-ink-muted">
                        {entry.reason}
                      </span>
                      <span className="mt-1 block max-w-[280px] text-xs leading-relaxed text-ink-faint">
                        {entry.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
            {risk.methodology}
          </p>
        </>
      )}
    </Panel>
  )
}
