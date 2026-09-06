import { ArrowRight, BarChart3, ShieldCheck, Target, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BrandLockup } from '@/components/layout/BrandMark'
import { ONBOARDING_STEPS, useOnboarding } from '../onboardingContext'

const HIGHLIGHTS = [
  {
    icon: Target,
    title: 'Targets in context',
    copy: 'Month and year to date against the number you committed to.',
  },
  {
    icon: BarChart3,
    title: 'A forecast you trust',
    copy: 'Weighted pipeline, coverage and the gap you still have to close.',
  },
  {
    icon: Users,
    title: 'Your team, ranked',
    copy: 'Who is ahead, who is slipping, and where to spend your morning.',
  },
]

export function WelcomeStep() {
  const { next, resumed } = useOnboarding()

  return (
    <div className="ambient relative flex min-h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center px-6 lg:px-10">
        <BrandLockup />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 lg:px-10">
        <div className="w-full max-w-2xl">
          <div className="animate-rise space-y-5 text-center">
            <p className="text-2xs font-medium uppercase tracking-[0.18em] text-accent">
              Workspace setup
            </p>
            <h1 className="text-balance text-display font-semibold text-ink">
              Welcome to Commercial
              <br />
              Command Center
            </h1>
            <p className="mx-auto max-w-md text-title leading-relaxed text-ink-muted">
              {resumed
                ? 'Your setup is right where you left it. Pick up from the next step.'
                : `Let's set up your workspace. ${ONBOARDING_STEPS.length - 1} short steps and the command center is calibrated to your team, your targets and your currency.`}
            </p>
          </div>

          <div
            className="mt-12 grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3"
            style={{ animation: 'var(--animate-rise)', animationDelay: '120ms' }}
          >
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="space-y-2.5 bg-surface p-5">
                <item.icon className="size-4 text-accent" aria-hidden />
                <p className="text-body font-medium text-ink">{item.title}</p>
                <p className="text-xs leading-relaxed text-ink-subtle">{item.copy}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-10 flex flex-col items-center gap-4"
            style={{ animation: 'var(--animate-rise)', animationDelay: '220ms' }}
          >
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={next}
              iconRight={<ArrowRight className="size-4" />}
              className="px-6"
            >
              {resumed ? 'Continue setup' : 'Set up my workspace'}
            </Button>
            <p className="flex items-center gap-1.5 text-xs text-ink-faint">
              <ShieldCheck className="size-3.5" aria-hidden />
              Everything stays in this browser. No account, no upload.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
