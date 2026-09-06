import { Wand2 } from 'lucide-react'
import { findCountry } from '@/data/catalogs'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { currencySymbol, formatCurrency } from '@/lib/format'
import { StepShell } from '../components/StepShell'
import { useOnboarding } from '../onboardingContext'

export function GoalsStep() {
  const { draft, errors, setGoals, clearError } = useOnboarding()

  const locale = findCountry(draft.company.country)?.locale ?? 'en-US'
  const currency = draft.company.currency || 'EUR'
  const symbol = currencySymbol(locale, currency)
  const formatContext = { locale, currency, compactNumbers: false }

  const projected = draft.goals.monthlyTarget * 12
  const gap = draft.goals.annualTarget - projected
  const showComparison = draft.goals.monthlyTarget > 0 && draft.goals.annualTarget > 0

  return (
    <StepShell
      title="What are you aiming at?"
      description="Targets drive every gauge, forecast and alert in the command center. Rough numbers are fine, you can refine them later."
    >
      <div className="space-y-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <AmountInput
            label="Monthly target"
            value={draft.goals.monthlyTarget}
            symbol={symbol}
            locale={locale}
            autoFocus
            error={errors.monthlyTarget}
            suffix="per month"
            onChange={(value) => {
              setGoals({ monthlyTarget: value })
              clearError('monthlyTarget')
            }}
          />
          <AmountInput
            label="Annual target"
            value={draft.goals.annualTarget}
            symbol={symbol}
            locale={locale}
            error={errors.annualTarget}
            suffix="per year"
            onChange={(value) => {
              setGoals({ annualTarget: value })
              clearError('annualTarget')
            }}
          />
        </div>

        {draft.goals.monthlyTarget > 0 ? (
          <div className="animate-fade-in rounded-panel border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-body text-ink">
                  Twelve months at your monthly target is{' '}
                  <span className="tnum font-medium text-accent">
                    {formatCurrency(projected, formatContext)}
                  </span>
                </p>
                {showComparison ? (
                  <p className="text-xs text-ink-subtle">
                    {Math.abs(gap) < projected * 0.01
                      ? 'Your annual target lines up with the monthly run rate.'
                      : gap > 0
                        ? `Your annual target is ${formatCurrency(gap, formatContext)} above that run rate.`
                        : `Your annual target is ${formatCurrency(Math.abs(gap), formatContext)} below that run rate.`}
                  </p>
                ) : (
                  <p className="text-xs text-ink-subtle">
                    Use it as your annual target, or set a different one.
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setGoals({ annualTarget: projected })
                  clearError('annualTarget')
                }}
                iconLeft={<Wand2 className="size-3.5" />}
              >
                Use 12x monthly
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </StepShell>
  )
}
