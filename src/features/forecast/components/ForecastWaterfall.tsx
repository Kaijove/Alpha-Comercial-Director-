import type { WaterfallStep } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * How the forecast is built, step by step.
 *
 * A waterfall rather than a pie or a stack, because the question is not "what
 * is the forecast made of" but "how did we get from money in the bank to this
 * number" - and that is a sequence, not a composition. The health and timing
 * adjustment is shown as its own subtraction so the model's discount is visible
 * rather than buried inside the pipeline figures.
 */
const toneStyles: Record<WaterfallStep['tone'], string> = {
  base: 'bg-ink-subtle',
  positive: 'bg-accent',
  negative: 'bg-negative',
  result: 'bg-positive',
}

export function ForecastWaterfall({
  steps,
  target,
}: {
  steps: WaterfallStep[]
  target: number
}) {
  const fmt = useFormatters()

  const ceiling = Math.max(target, ...steps.map((step) => Math.abs(step.total)), 1)

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="From Closed Revenue to Forecast"
        description="Each step is a contribution to the base forecast, in the order the model applies them."
      />

      <ol className="mt-6 space-y-3.5">
        {steps.map((step) => {
          const isResult = step.tone === 'result'
          const barShare = Math.max(0, Math.min(1, step.total / ceiling))
          const deltaShare = Math.max(0, Math.min(1, Math.abs(step.delta) / ceiling))
          // A negative step is drawn hanging back from where the running total
          // reached, so the subtraction reads as a subtraction. The result bar
          // is the whole total and starts at zero, not at itself.
          const offset = isResult
            ? 0
            : step.delta < 0
              ? Math.max(0, barShare)
              : Math.max(0, barShare - deltaShare)

          return (
            <li key={step.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <span
                  className={cn(
                    'text-body',
                    isResult ? 'font-medium text-ink' : 'text-ink-muted',
                  )}
                >
                  {step.label}
                </span>
                <span className="flex shrink-0 items-baseline gap-3">
                  {!isResult && step.delta !== 0 ? (
                    <span
                      className={cn(
                        'tnum text-xs',
                        step.delta < 0 ? 'text-negative' : 'text-ink-faint',
                      )}
                    >
                      {step.delta < 0 ? '−' : '+'}
                      {fmt.currency(Math.abs(step.delta))}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'tnum text-body',
                      isResult ? 'font-semibold text-ink' : 'text-ink-subtle',
                    )}
                    title={fmt.exact(step.total)}
                  >
                    {fmt.currency(step.total)}
                  </span>
                </span>
              </div>

              <div className="relative h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={cn('absolute inset-y-0 rounded-full', toneStyles[step.tone])}
                  style={{
                    left: `${offset * 100}%`,
                    width: `${Math.max(isResult ? barShare : deltaShare, 0.004) * 100}%`,
                  }}
                />
                {target > 0 ? (
                  <span
                    className="absolute inset-y-0 w-px bg-ink-subtle/70"
                    style={{ left: `${Math.min(100, (target / ceiling) * 100)}%` }}
                    aria-hidden
                  />
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-ink-faint">{step.detail}</p>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}
