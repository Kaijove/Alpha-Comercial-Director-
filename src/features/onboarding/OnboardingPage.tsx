import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, ShieldCheck } from 'lucide-react'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { BrandLockup } from '@/components/layout/BrandMark'
import { CompletionScreen } from './CompletionScreen'
import { OnboardingProvider } from './OnboardingProvider'
import { useOnboarding } from './onboardingContext'
import { StepProgressBar, StepRail } from './components/StepRail'
import { AboutYouStep } from './steps/AboutYouStep'
import { CompanyStep } from './steps/CompanyStep'
import { GoalsStep } from './steps/GoalsStep'
import { ReviewStep } from './steps/ReviewStep'
import { TeamStep } from './steps/TeamStep'
import { WelcomeStep } from './steps/WelcomeStep'

export function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  )
}

function OnboardingFlow() {
  const { draft, step, direction, reset } = useOnboarding()
  const { completeOnboarding } = useWorkspace()
  const navigate = useNavigate()
  const [completing, setCompleting] = useState(false)

  const finish = useCallback(() => {
    completeOnboarding(draft)
    navigate('/dashboard', { replace: true })
  }, [completeOnboarding, draft, navigate])

  if (completing) {
    return (
      <CompletionScreen
        companyName={draft.company.name || 'Your company'}
        onDone={finish}
      />
    )
  }

  if (step === 0) return <WelcomeStep />

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-[300px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-6">
          <BrandLockup />
        </div>

        <div className="flex-1 px-3 py-6">
          <p className="px-3 pb-3 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
            Setup
          </p>
          <StepRail />
        </div>

        <div className="space-y-3 border-t border-line px-6 py-5">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-subtle">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ink-faint" aria-hidden />
            Your answers are saved as you type and never leave this browser.
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink-muted"
          >
            <RotateCcw className="size-3" />
            Start over
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="px-6 pt-6 lg:hidden">
          <StepProgressBar />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-12 lg:py-14">
          <div
            key={step}
            className={
              direction === 'forward'
                ? 'w-full max-w-2xl animate-step-forward'
                : 'w-full max-w-2xl animate-step-back'
            }
          >
            {step === 1 ? <AboutYouStep /> : null}
            {step === 2 ? <CompanyStep /> : null}
            {step === 3 ? <GoalsStep /> : null}
            {step === 4 ? <TeamStep /> : null}
            {step === 5 ? <ReviewStep onComplete={() => setCompleting(true)} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
