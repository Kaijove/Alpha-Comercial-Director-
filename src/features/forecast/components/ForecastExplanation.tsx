import { Check, TriangleAlert } from 'lucide-react'
import type { ForecastReport } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { useFormatters } from '@/hooks/useFormatters'
import { MicroLabel, ScoreRail } from './ForecastVisuals'

/**
 * Why this forecast, and how much it deserves to be believed.
 *
 * Every line is a fact the engine computed, with the figure that produced it.
 * Nothing here is commentary: if a driver appears, a calculation put it there.
 */
export function ForecastExplanation({ forecast }: { forecast: ForecastReport }) {
  const fmt = useFormatters()
  const { confidence, drivers } = forecast

  const positives = drivers.filter((driver) => driver.tone === 'positive')
  const negatives = drivers.filter((driver) => driver.tone === 'negative')

  const tone =
    confidence.level === 'high' ? 'positive' : confidence.level === 'moderate' ? 'accent' : 'warning'

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Why This Forecast?"
        description="The drivers behind the number, and how much weight it can carry."
        action={
          <Badge tone={tone}>
            {confidence.label} · {confidence.score}
          </Badge>
        }
      />

      <div className="mt-5 space-y-2">
        <ScoreRail score={confidence.score} tone={tone} />
        <p className="text-body leading-relaxed text-ink-muted">{confidence.summary}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <MicroLabel>Positive drivers</MicroLabel>
          {positives.length > 0 ? (
            <ul className="space-y-2.5">
              {positives.map((driver) => (
                <li key={driver.text} className="flex gap-2.5 text-body leading-relaxed">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
                  <span className="text-ink-muted">{driver.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-faint">
              Nothing in the current data is working in the forecast&apos;s favour.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <MicroLabel>Negative drivers</MicroLabel>
          {negatives.length > 0 ? (
            <ul className="space-y-2.5">
              {negatives.map((driver) => (
                <li key={driver.text} className="flex gap-2.5 text-body leading-relaxed">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
                  <span className="text-ink-muted">{driver.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-faint">
              Nothing in the current data is working against the forecast.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 border-t border-line pt-5">
        <MicroLabel>What the confidence score is made of</MicroLabel>
        <ul className="space-y-2.5">
          {[...confidence.factors]
            .sort((a, b) => a.score - b.score)
            .map((factor) => (
              <li key={factor.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-4 text-body">
                  <span className="text-ink-muted">{factor.label}</span>
                  <span className="tnum shrink-0 text-xs text-ink-faint">
                    {Math.round(factor.score)}/100 · {fmt.percent(factor.weight, 0)} weight
                  </span>
                </div>
                <ScoreRail
                  score={factor.score}
                  tone={factor.score >= 70 ? 'positive' : factor.score >= 45 ? 'accent' : 'warning'}
                />
                <p className="text-xs leading-relaxed text-ink-faint">{factor.detail}</p>
              </li>
            ))}
        </ul>
      </div>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-faint">
        {forecast.methodology}
      </p>
    </Panel>
  )
}
