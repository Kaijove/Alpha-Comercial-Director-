import { RotateCcw } from 'lucide-react'
import type { SimulatorInputs, SimulatorResult } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useFormatters } from '@/hooks/useFormatters'
import { MicroLabel, ScoreRail } from './ForecastVisuals'

/**
 * A simulation, and only a simulation.
 *
 * The three levers are applied to the same deal-level model over the same
 * unchanged opportunities, and the result is recomputed on every render from
 * the real pipeline. Nothing is written anywhere: closing the page discards it,
 * and Reset puts every lever back where it started.
 */
export function ScenarioSimulator({
  inputs,
  onChange,
  onReset,
  result,
  baseValue,
  target,
}: {
  inputs: SimulatorInputs
  onChange: (inputs: SimulatorInputs) => void
  onReset: () => void
  result: SimulatorResult
  baseValue: number
  target: number
}) {
  const fmt = useFormatters()
  const delta = result.value - baseValue

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Scenario Simulator"
        description="Move the assumptions and watch the projection respond. Nothing here changes your data."
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={result.isDefault}
            iconLeft={<RotateCcw className="size-3.5" aria-hidden />}
          >
            Reset scenario
          </Button>
        }
      />

      <div className="mt-6 space-y-5">
        <Slider
          label="Win rate"
          hint="Scales every probability"
          value={inputs.winRateFactor}
          min={0.5}
          max={1.5}
          step={0.05}
          display={`${inputs.winRateFactor >= 1 ? '+' : ''}${Math.round((inputs.winRateFactor - 1) * 100)}%`}
          onChange={(winRateFactor) => onChange({ ...inputs, winRateFactor })}
        />
        <Slider
          label="Average deal size"
          hint="Scales every deal value"
          value={inputs.dealSizeFactor}
          min={0.5}
          max={1.5}
          step={0.05}
          display={`${inputs.dealSizeFactor >= 1 ? '+' : ''}${Math.round((inputs.dealSizeFactor - 1) * 100)}%`}
          onChange={(dealSizeFactor) => onChange({ ...inputs, dealSizeFactor })}
        />
        <Slider
          label="Extra deals closing"
          hint="Added at the average contribution"
          value={inputs.extraDeals}
          min={0}
          max={10}
          step={1}
          display={`${inputs.extraDeals}`}
          onChange={(extraDeals) => onChange({ ...inputs, extraDeals })}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3">
        <Result
          label="Projected revenue"
          value={fmt.currency(result.value)}
          hint={
            result.isDefault
              ? 'Unchanged from the base forecast'
              : `${delta >= 0 ? '+' : '−'}${fmt.currency(Math.abs(delta))} against the base forecast`
          }
        />
        <Result
          label="Target attainment"
          value={result.attainment !== null ? fmt.percent(result.attainment, 1) : '—'}
          hint={
            target > 0
              ? result.gap >= 0
                ? `${fmt.currency(result.gap)} above target`
                : `${fmt.currency(Math.abs(result.gap))} below target`
              : 'No target set'
          }
        />
        <Result
          label="Probability of target"
          value={`${result.probability}%`}
          rail={result.probability}
        />
      </div>

      {!result.isDefault ? (
        <p className="mt-4">
          <Badge tone="accent">Simulation only — your commercial data is unchanged</Badge>
        </p>
      ) : null}
    </Panel>
  )
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}) {
  const id = `sim-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-body text-ink">
          {label}
          <span className="ml-2 text-xs text-ink-faint">{hint}</span>
        </label>
        <span className="tnum shrink-0 text-body font-medium text-ink">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
      />
    </div>
  )
}

function Result({
  label,
  value,
  hint,
  rail,
}: {
  label: string
  value: string
  hint?: string
  rail?: number
}) {
  return (
    <div className="space-y-2 bg-surface p-5">
      <MicroLabel>{label}</MicroLabel>
      <p className="tnum text-metric font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {typeof rail === 'number' ? (
        <ScoreRail
          score={rail}
          tone={rail >= 70 ? 'positive' : rail >= 45 ? 'accent' : 'warning'}
        />
      ) : null}
      {hint ? <p className="text-xs leading-relaxed text-ink-faint">{hint}</p> : null}
    </div>
  )
}
