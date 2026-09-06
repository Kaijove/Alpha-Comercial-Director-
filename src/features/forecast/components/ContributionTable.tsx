import { useMemo } from 'react'
import { STAGE_LABELS } from '@/domain/commerce'
import type { ForecastContribution, ForecastReport } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SortHeader } from '@/components/composite/SortHeader'
import { useSortable } from '@/hooks/useSortable'
import { useFormatters } from '@/hooks/useFormatters'
import { BAND_TONE, MicroLabel } from './ForecastVisuals'

type Column =
  | 'name'
  | 'customer'
  | 'owner'
  | 'stage'
  | 'value'
  | 'probability'
  | 'health'
  | 'close'
  | 'contribution'

/**
 * Every deal in the forecast, with the arithmetic that put it there.
 *
 * The four factors are shown as separate columns rather than a single number,
 * because a director who cannot see why a 100k deal contributes 31k will not
 * trust the total - and clicking through opens the same opportunity drawer the
 * Pipeline uses, so there is one place a deal is edited.
 */
export function ContributionTable({
  forecast,
  customerName,
  ownerName,
  onSelect,
}: {
  forecast: ForecastReport
  customerName: (id: string) => string
  ownerName: (id: string) => string
  onSelect: (contribution: ForecastContribution) => void
}) {
  const fmt = useFormatters()

  const accessors = useMemo(
    () => ({
      name: (row: ForecastContribution) => row.opportunity.name,
      customer: (row: ForecastContribution) => customerName(row.opportunity.customerId),
      owner: (row: ForecastContribution) => ownerName(row.opportunity.ownerId),
      stage: (row: ForecastContribution) => row.opportunity.stage,
      value: (row: ForecastContribution) => row.value,
      probability: (row: ForecastContribution) => row.probability,
      health: (row: ForecastContribution) => row.health.score,
      close: (row: ForecastContribution) => row.opportunity.expectedCloseDate,
      contribution: (row: ForecastContribution) => row.contribution,
    }),
    [customerName, ownerName],
  )

  const { sorted, sort, toggle } = useSortable<ForecastContribution, Column>(
    forecast.contributions,
    accessors,
    { key: 'contribution', direction: 'desc' },
  )

  const total = forecast.expectedFromPipeline

  return (
    <Panel flush className="flex flex-col overflow-hidden">
      <div className="p-6 pb-0">
        <PanelHeader
          title="Opportunity Forecast"
          description="Value multiplied by probability, health and timing. Select a row to open the opportunity."
          action={
            <div className="text-right">
              <MicroLabel>From open deals</MicroLabel>
              <p className="tnum mt-1 text-title font-medium text-ink">
                {fmt.currency(total)}
              </p>
            </div>
          }
        />
      </div>

      {sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No open deals due in this period"
            description="The forecast is made up entirely of revenue already closed."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1020px] border-collapse text-body">
            <thead>
              <tr className="border-y border-line text-ink-faint">
                <SortHeader
                  label="Opportunity"
                  columnKey="name"
                  align="left"
                  active={sort.key === 'name'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Customer"
                  columnKey="customer"
                  align="left"
                  active={sort.key === 'customer'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Owner"
                  columnKey="owner"
                  align="left"
                  active={sort.key === 'owner'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Stage"
                  columnKey="stage"
                  align="left"
                  active={sort.key === 'stage'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Value"
                  columnKey="value"
                  active={sort.key === 'value'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Prob."
                  columnKey="probability"
                  active={sort.key === 'probability'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Health"
                  columnKey="health"
                  active={sort.key === 'health'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Close"
                  columnKey="close"
                  active={sort.key === 'close'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="In forecast"
                  columnKey="contribution"
                  active={sort.key === 'contribution'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((row) => (
                <tr
                  key={row.opportunity.id}
                  onClick={() => onSelect(row)}
                  className="cursor-pointer transition-colors hover:bg-elevated"
                >
                  <td className="px-3 py-3">
                    <span className="block max-w-[200px] truncate text-ink">
                      {row.opportunity.name}
                    </span>
                    {row.adjustment ? (
                      <span className="mt-0.5 block max-w-[200px] truncate text-xs text-ink-faint">
                        {row.adjustment}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    <span className="block max-w-[150px] truncate">
                      {customerName(row.opportunity.customerId)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    <span className="block max-w-[120px] truncate">
                      {ownerName(row.opportunity.ownerId)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink-muted">
                    {STAGE_LABELS[row.opportunity.stage]}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">
                    {fmt.currency(row.value)}
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">
                    {fmt.percent(row.probability, 0)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Badge tone={BAND_TONE[row.health.band]}>{row.health.score}</Badge>
                  </td>
                  <td className="px-3 py-3 text-right text-ink-subtle">
                    {fmt.shortDate(row.opportunity.expectedCloseDate)}
                  </td>
                  <td className="tnum px-3 py-3 text-right font-medium text-ink">
                    {fmt.currency(row.contribution)}
                    {row.healthFactor < 1 || row.timingFactor < 1 ? (
                      <span className="mt-0.5 block text-xs font-normal text-ink-faint">
                        ×{row.healthFactor.toFixed(2)} health ×{row.timingFactor.toFixed(2)} timing
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
