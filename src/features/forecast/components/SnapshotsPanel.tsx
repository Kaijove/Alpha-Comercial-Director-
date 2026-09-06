import { Camera, Trash2 } from 'lucide-react'
import type { ForecastAccuracy, ForecastSnapshot } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useFormatters } from '@/hooks/useFormatters'
import { MicroLabel } from './ForecastVisuals'

/**
 * Saved forecasts, and the accuracy they will eventually support.
 *
 * A snapshot records what the model said at a moment in time so that "what did
 * we predict two weeks ago" becomes answerable. Accuracy stays deliberately
 * unavailable until real snapshots have accumulated and their periods have
 * closed - a fabricated variance would be worse than an empty panel.
 */
export function SnapshotsPanel({
  snapshots,
  accuracy,
  onSave,
  onClear,
  currentValue,
}: {
  snapshots: ForecastSnapshot[]
  accuracy: ForecastAccuracy
  onSave: () => void
  onClear: () => void
  currentValue: number
}) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Forecast Snapshots"
        description="Save what the forecast says today so it can be compared with what it says later."
        action={
          <div className="flex items-center gap-2">
            {snapshots.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                iconLeft={<Trash2 className="size-3.5" aria-hidden />}
              >
                Clear
              </Button>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={onSave}
              iconLeft={<Camera className="size-3.5" aria-hidden />}
            >
              Save snapshot
            </Button>
          </div>
        }
      />

      {snapshots.length === 0 ? (
        <p className="mt-5 text-body leading-relaxed text-ink-muted">
          No snapshots saved for this period yet. Saving one records the current forecast of{' '}
          <span className="tnum text-ink">{fmt.currency(currentValue)}</span>, its confidence and
          its target probability.
        </p>
      ) : (
        <>
          <MicroLabel>This period</MicroLabel>
          <ul className="mt-3 space-y-px overflow-hidden rounded-panel border border-line bg-line">
            {snapshots.map((snapshot) => {
              const drift = currentValue - snapshot.forecastValue
              return (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-surface px-4 py-3"
                >
                  <span className="text-body text-ink-muted">
                    {fmt.date(snapshot.createdAt)}
                    <span className="ml-2 text-xs uppercase tracking-wide text-ink-faint">
                      {snapshot.scenario}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <span className="text-xs text-ink-faint">
                      {snapshot.confidence}/100 confidence · {snapshot.probability}% probability
                    </span>
                    <span className="tnum text-body text-ink">
                      {fmt.currency(snapshot.forecastValue)}
                    </span>
                    {drift !== 0 ? (
                      <span
                        className={`tnum text-xs ${drift > 0 ? 'text-positive' : 'text-warning'}`}
                      >
                        {drift > 0 ? '+' : '−'}
                        {fmt.currency(Math.abs(drift))} since
                      </span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <div className="mt-6 space-y-2 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-4">
          <MicroLabel>Forecast accuracy</MicroLabel>
          <Badge tone={accuracy.available ? 'accent' : 'outline'}>
            {accuracy.available ? 'Available' : 'Not yet available'}
          </Badge>
        </div>
        <p className="text-body leading-relaxed text-ink-muted">{accuracy.message}</p>

        {accuracy.available ? (
          <ul className="mt-3 space-y-2">
            {accuracy.scored.map((entry) => (
              <li
                key={entry.snapshot.id}
                className="flex items-baseline justify-between gap-4 text-body"
              >
                <span className="text-ink-muted">{entry.snapshot.periodLabel}</span>
                <span className="flex items-baseline gap-3">
                  <span className="tnum text-xs text-ink-faint">
                    {fmt.currency(entry.snapshot.forecastValue)} forecast vs{' '}
                    {fmt.currency(entry.snapshot.actualValue ?? 0)} actual
                  </span>
                  <span className="tnum text-ink">{Math.round(entry.accuracy)}%</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  )
}
