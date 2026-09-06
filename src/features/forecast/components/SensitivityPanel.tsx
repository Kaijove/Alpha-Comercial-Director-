import type { ForecastSensitivity, SensitivityPoint } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { MicroLabel } from './ForecastVisuals'

/**
 * What the forecast does when the assumptions move.
 *
 * Every row is the same model re-run over the same unchanged opportunities.
 * Nothing here mutates a deal: the exclusions are filters applied to a
 * calculation, not edits to the pipeline.
 */
export function SensitivityPanel({
  sensitivity,
  target,
}: {
  sensitivity: ForecastSensitivity
  target: number
}) {
  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Sensitivity"
        description="How the forecast responds to conversion moving, and to leaving parts of the pipeline out."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Group
          label="If conversion changes"
          points={sensitivity.conversion}
          target={target}
        />
        <Group
          label="If parts of the pipeline are excluded"
          points={sensitivity.pipeline}
          target={target}
        />
      </div>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        These are analytical re-runs of the forecast model. No opportunity is changed by
        anything on this panel.
      </p>
    </Panel>
  )
}

function Group({
  label,
  points,
  target,
}: {
  label: string
  points: SensitivityPoint[]
  target: number
}) {
  const fmt = useFormatters()
  const peak = Math.max(...points.map((point) => point.value), target, 1)

  return (
    <div className="space-y-3">
      <MicroLabel>{label}</MicroLabel>
      <ul className="space-y-3">
        {points.map((point) => (
          <li key={point.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-body text-ink-muted">{point.label}</span>
              <span className="flex shrink-0 items-baseline gap-3">
                {point.delta !== 0 ? (
                  <span
                    className={cn(
                      'tnum text-xs',
                      point.delta > 0 ? 'text-positive' : 'text-warning',
                    )}
                  >
                    {point.delta > 0 ? '+' : '−'}
                    {fmt.currency(Math.abs(point.delta))}
                  </span>
                ) : null}
                <span className="tnum text-body text-ink">{fmt.currency(point.value)}</span>
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  'h-full rounded-full',
                  target > 0 && point.value >= target ? 'bg-positive' : 'bg-accent',
                )}
                style={{ width: `${Math.max(0, Math.min(100, (point.value / peak) * 100))}%` }}
              />
              {target > 0 ? (
                <span
                  className="absolute inset-y-0 w-px bg-ink-subtle"
                  style={{ left: `${Math.min(100, (target / peak) * 100)}%` }}
                  aria-hidden
                />
              ) : null}
            </div>
            {point.attainment !== null ? (
              <p className="text-xs text-ink-faint">
                {fmt.percent(point.attainment, 0)} of target
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
