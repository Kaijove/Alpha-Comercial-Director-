import { ArrowRight, Check } from 'lucide-react'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import type { ForecastContribution } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { useFormatters } from '@/hooks/useFormatters'
import { BAND_TONE, MicroLabel, StatRow } from './ForecastVisuals'

/**
 * What would actually have to happen.
 *
 * The deals below are taken at full value, because a deal that closes brings in
 * all of it. The panel never says a particular deal will close - it says which
 * ones, if they did, would cover the gap, which is a question a director can
 * act on this afternoon.
 */
export function PathToTargetPanel({
  metrics,
  onSelect,
}: {
  metrics: CommercialMetrics
  onSelect: (contribution: ForecastContribution) => void
}) {
  const fmt = useFormatters()
  const forecast = metrics.forecast
  const { path, gapDetail } = forecast

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Path to Target"
        description={path.summary}
        action={
          path.required === 0 ? (
            <Badge tone="positive">
              <Check className="size-3" aria-hidden />
              Covered
            </Badge>
          ) : null
        }
      />

      <div className="mt-5 divide-y divide-line border-y border-line">
        <StatRow label="Current revenue" value={fmt.currency(metrics.revenue)} />
        <StatRow label="Base forecast" value={fmt.currency(forecast.value)} />
        <StatRow label="Target" value={fmt.currency(metrics.target)} />
        <StatRow
          label="Additional required"
          value={
            gapDetail.additionalRequired > 0
              ? fmt.currency(gapDetail.additionalRequired)
              : '—'
          }
          emphasis
        />
      </div>

      {path.required > 0 ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <MicroLabel>
              {path.reachable
                ? `Closing ${path.needed} of these would cover it`
                : 'The largest opportunities available'}
            </MicroLabel>
            <span className="text-xs text-ink-faint">
              {path.candidates} open {path.candidates === 1 ? 'deal' : 'deals'} in the period
            </span>
          </div>

          <ul className="mt-3 space-y-px overflow-hidden rounded-panel border border-line bg-line">
            {path.deals.map((entry) => (
              <li key={entry.opportunity.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="group flex w-full items-center gap-4 bg-surface px-4 py-3 text-left transition-colors hover:bg-elevated"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink">
                      {entry.opportunity.name}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                      <span>{fmt.percent(entry.probability, 0)} probability</span>
                      <span aria-hidden>·</span>
                      <span>{fmt.shortDate(entry.opportunity.expectedCloseDate)}</span>
                      <Badge tone={BAND_TONE[entry.health.band]}>
                        {entry.health.band === 'at-risk'
                          ? 'At risk'
                          : entry.health.band.charAt(0).toUpperCase() + entry.health.band.slice(1)}
                      </Badge>
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right text-body text-ink">
                    {fmt.currency(entry.value)}
                    <span className="mt-0.5 block text-xs font-normal text-ink-faint">
                      {fmt.currency(entry.contribution)} in forecast
                    </span>
                  </span>
                  <ArrowRight
                    className="size-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            {fmt.currency(path.highConfidenceValue)} of the open pipeline sits at 70% probability
            or above. Nothing here promises a particular deal will close.
          </p>
        </>
      ) : (
        <p className="mt-5 text-body leading-relaxed text-ink-muted">
          {path.summary} {fmt.currency(path.highConfidenceValue)} of open pipeline sits at 70%
          probability or above.
        </p>
      )}
    </Panel>
  )
}
