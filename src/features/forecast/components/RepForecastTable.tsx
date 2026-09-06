import { useMemo } from 'react'
import type { RepForecast } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { EmptyState } from '@/components/ui/EmptyState'
import { SortHeader } from '@/components/composite/SortHeader'
import { useSortable } from '@/hooks/useSortable'
import { useFormatters } from '@/hooks/useFormatters'
import { ScoreRail, StateBadge } from './ForecastVisuals'

type Column =
  | 'name'
  | 'revenue'
  | 'target'
  | 'pipeline'
  | 'weighted'
  | 'forecast'
  | 'attainment'
  | 'gap'
  | 'confidence'

/**
 * The same forecast, split by who owns it.
 *
 * Built from the same opportunities and the same rep targets the Team page
 * uses - there is no second representative dataset, so a rep's number here and
 * their number there always agree.
 */
export function RepForecastTable({ reps }: { reps: RepForecast[] }) {
  const fmt = useFormatters()

  const accessors = useMemo(
    () => ({
      name: (row: RepForecast) => row.name,
      revenue: (row: RepForecast) => row.revenue,
      target: (row: RepForecast) => row.target,
      pipeline: (row: RepForecast) => row.pipeline,
      weighted: (row: RepForecast) => row.weightedPipeline,
      forecast: (row: RepForecast) => row.forecast,
      attainment: (row: RepForecast) => row.attainment,
      gap: (row: RepForecast) => row.gap,
      confidence: (row: RepForecast) => row.confidence,
    }),
    [],
  )

  const { sorted, sort, toggle } = useSortable<RepForecast, Column>(reps, accessors, {
    key: 'forecast',
    direction: 'desc',
  })

  return (
    <Panel flush className="flex flex-col overflow-hidden">
      <div className="p-6 pb-0">
        <PanelHeader
          title="Forecast by Representative"
          description="Each rep's closed revenue plus their share of the projected pipeline, against their own target."
        />
      </div>

      {sorted.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No representatives to forecast"
            description="Add a sales team in Settings to see the forecast split by owner."
          />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-body">
            <thead>
              <tr className="border-y border-line text-ink-faint">
                <SortHeader
                  label="Representative"
                  columnKey="name"
                  align="left"
                  active={sort.key === 'name'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader label="Revenue" columnKey="revenue" active={sort.key === 'revenue'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Target" columnKey="target" active={sort.key === 'target'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Pipeline" columnKey="pipeline" active={sort.key === 'pipeline'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Weighted" columnKey="weighted" active={sort.key === 'weighted'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Forecast" columnKey="forecast" active={sort.key === 'forecast'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Attainment" columnKey="attainment" active={sort.key === 'attainment'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Gap" columnKey="gap" active={sort.key === 'gap'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <SortHeader label="Confidence" columnKey="confidence" active={sort.key === 'confidence'} direction={sort.direction} onSort={toggle} className="px-3 py-2.5" />
                <th scope="col" className="px-3 py-2.5 text-right text-2xs font-medium uppercase tracking-[0.1em]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((rep) => (
                <tr key={rep.ownerId} className="transition-colors hover:bg-elevated">
                  <td className="px-3 py-3 text-ink">
                    <span className="block max-w-[160px] truncate">{rep.name}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {rep.dealCount} {rep.dealCount === 1 ? 'deal' : 'deals'} in the period
                    </span>
                  </td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">{fmt.currency(rep.revenue)}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">{fmt.currency(rep.target)}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">{fmt.currency(rep.pipeline)}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">{fmt.currency(rep.weightedPipeline)}</td>
                  <td className="tnum px-3 py-3 text-right font-medium text-ink">{fmt.currency(rep.forecast)}</td>
                  <td className="tnum px-3 py-3 text-right text-ink-subtle">
                    {rep.attainment !== null ? fmt.percent(rep.attainment, 0) : '—'}
                  </td>
                  <td
                    className={`tnum px-3 py-3 text-right ${rep.gap >= 0 ? 'text-positive' : 'text-warning'}`}
                  >
                    {rep.gap >= 0 ? '+' : '−'}
                    {fmt.currency(Math.abs(rep.gap))}
                  </td>
                  <td className="px-3 py-3">
                    <div className="ml-auto w-16 space-y-1">
                      <span className="tnum block text-right text-xs text-ink-subtle">
                        {rep.confidence}
                      </span>
                      <ScoreRail
                        score={rep.confidence}
                        tone={
                          rep.confidence >= 70 ? 'positive' : rep.confidence >= 45 ? 'accent' : 'warning'
                        }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <StateBadge state={rep.state} />
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
