import { useRef } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ONBOARDING_STEPS, useOnboarding } from '../onboardingContext'

export interface StepShellProps {
  title: string
  description?: ReactNode
  children: ReactNode
  /** Label for the primary button. Defaults to "Continue". */
  continueLabel?: string
  /** Renders a tertiary "skip" action for optional steps. */
  onSkip?: () => void
  skipLabel?: string
  onSubmit?: () => void
  footnote?: ReactNode
}

export function StepShell({
  title,
  description,
  children,
  continueLabel = 'Continue',
  onSkip,
  skipLabel = 'Skip for now',
  onSubmit,
  footnote,
}: StepShellProps) {
  const { step, next, back, totalSteps } = useOnboarding()

  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (onSubmit) {
      onSubmit()
      // Validation runs inside `onSubmit` and renders its messages on the next
      // paint. Without this, pressing Continue on an invalid step looked like
      // nothing happened: the errors appeared further down the form, possibly
      // below the fold, and focus stayed on the button. Moving focus to the
      // first field that failed makes the reason immediate, and works the same
      // for a keyboard user and a screen reader.
      requestAnimationFrame(() => {
        const invalid = formRef.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        )
        invalid?.focus({ preventScroll: false })
      })
      return
    }
    next()
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-full flex-col">
      <header className="space-y-2.5">
        <p className="text-2xs font-medium uppercase tracking-[0.14em] text-accent">
          Step {step} of {totalSteps - 1}
          <span className="mx-2 text-ink-faint">/</span>
          <span className="text-ink-subtle">{ONBOARDING_STEPS[step].label}</span>
        </p>
        <h2 className="text-balance text-page font-semibold text-ink">
          {title}
        </h2>
        {description ? (
          <p className="max-w-lg text-sm leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </header>

      <div className="mt-9 flex-1">{children}</div>

      <footer
        className={cn(
          'mt-10 flex flex-col gap-4 border-t border-line pt-6',
          'sm:flex-row sm:items-center sm:justify-between',
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            iconLeft={<ArrowLeft className="size-4" />}
          >
            Back
          </Button>
          {onSkip ? (
            <Button type="button" variant="ghost" onClick={onSkip}>
              {skipLabel}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          {footnote ? (
            <span className="hidden text-xs text-ink-faint sm:inline">{footnote}</span>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            iconRight={<ArrowRight className="size-4" />}
          >
            {continueLabel}
          </Button>
        </div>
      </footer>
    </form>
  )
}
