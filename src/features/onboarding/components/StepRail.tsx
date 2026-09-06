import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ONBOARDING_STEPS, useOnboarding } from '../onboardingContext'

/** Vertical progress rail shown on large screens. */
export function StepRail() {
  const { step, goTo } = useOnboarding()

  return (
    <ol className="space-y-1">
      {ONBOARDING_STEPS.map((item, index) => {
        const isDone = index < step
        const isActive = index === step
        const isReachable = index <= step

        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!isReachable}
              onClick={() => isReachable && goTo(index)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left transition-colors duration-200',
                isActive && 'bg-raised',
                isReachable && !isActive && 'hover:bg-raised/50',
                !isReachable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-2xs font-medium transition-all duration-300',
                  isDone && 'border-accent/30 bg-accent/12 text-accent',
                  isActive && 'border-accent bg-accent text-accent-ink',
                  !isDone && !isActive && 'border-line text-ink-faint',
                )}
              >
                {isDone ? <Check className="size-3" strokeWidth={2.5} /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-body transition-colors duration-200',
                  isActive ? 'font-medium text-ink' : isDone ? 'text-ink-muted' : 'text-ink-faint',
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/** Compact horizontal progress used below the `lg` breakpoint. */
export function StepProgressBar() {
  const { step, totalSteps } = useOnboarding()
  const percent = ((step + 1) / totalSteps) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
          {ONBOARDING_STEPS[step].label}
        </span>
        <span className="tnum text-2xs text-ink-faint">
          {step + 1} / {totalSteps}
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out-soft"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
