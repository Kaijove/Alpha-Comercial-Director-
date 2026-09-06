import type { ForecastReport, ScenarioKey } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { MicroLabel, SCENARIO_TONE } from './ForecastVisuals'

/**
 * Worst, base and best case.
 *
 * Each card states its own assumption. None of the three is a percentage of
 * another - they are three runs of the same deal-level model under different,
 * stated rules about which deals land, which is the only version of this
 * feature a director can argue with.
 */
const railTones: Record<string, string> = {
  warning: 'bg-warning',
  accent: 'bg-accent',
  positive: 'bg-positive',
}

export function ScenarioPanel({
  forecast,
  target,
  selected,
  onSelect,
}: {
  forecast: ForecastReport
  target: number
  selected: ScenarioKey
  onSelect: (key: ScenarioKey) => void
}) {
  const fmt = useFormatters()

  // Every bar is drawn against the same ceiling so the three are comparable at
  // a glance, with the target sitting in the same place on each.
  const ceiling = Math.max(
    forecast.scenarios.best.value,
    target,
    forecast.scenarios.base.value,
  )

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Forecast Scenarios"
        description="Three runs of the same model under different assumptions about which open deals land."
      />

      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line lg:grid-cols-3">
        {forecast.scenarioList.map((scenario) => {
          const tone = SCENARIO_TONE[scenario.key]
          const active = scenario.key === selected
          const share = ceiling > 0 ? scenario.value / ceiling : 0
          const targetShare = ceiling > 0 ? target / ceiling : 0

          return (
            <button
              key={scenario.key}
              type="button"
              onClick={() => onSelect(scenario.key)}
              aria-pressed={active}
              className={cn(
                'group flex flex-col gap-3 bg-surface p-5 text-left transition-colors',
                active ? 'bg-elevated' : 'hover:bg-elevated/60',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <MicroLabel>{scenario.label}</MicroLabel>
                {scenario.attainment !== null ? (
                  <span className="tnum text-xs text-ink-faint">
                    {fmt.percent(scenario.attainment, 0)}
                  </span>
                ) : null}
              </div>

              <p
                className="tnum text-metric font-semibold leading-none tracking-tight text-ink"
                title={fmt.exact(scenario.value)}
              >
                {fmt.currency(scenario.value)}
              </p>

              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={cn('h-full rounded-full', railTones[tone])}
                  style={{ width: `${Math.max(0, Math.min(100, share * 100))}%` }}
                />
                {target > 0 ? (
                  <span
                    className="absolute inset-y-0 w-px bg-ink-subtle"
                    style={{ left: `${Math.max(0, Math.min(100, targetShare * 100))}%` }}
                    aria-hidden
                  />
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-ink-muted">
                {scenario.gap >= 0
                  ? `${fmt.currency(scenario.gap)} above target`
                  : `${fmt.currency(Math.abs(scenario.gap))} below target`}
                {' · '}
                {scenario.dealCount} open {scenario.dealCount === 1 ? 'deal' : 'deals'}
              </p>

              <p className="mt-auto border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
                {scenario.assumption}
              </p>
            </button>
          )
        })}
      </div>

      {target > 0 ? (
        <p className="mt-4 text-xs text-ink-faint">
          The vertical mark on each bar is the {fmt.currency(target)} target.
        </p>
      ) : null}
    </Panel>
  )
}
