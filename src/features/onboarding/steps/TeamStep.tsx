import { findCountry } from '@/data/catalogs'
import { TeamEditor } from '@/components/composite/TeamEditor'
import { formatCurrency } from '@/lib/format'
import { StepShell } from '../components/StepShell'
import { useOnboarding } from '../onboardingContext'

export function TeamStep() {
  const { draft, errors, setTeam, next, goTo } = useOnboarding()

  const namedReps = draft.team.filter((rep) => rep.name.trim().length > 0)
  const locale = findCountry(draft.company.country)?.locale ?? 'en-US'
  const currency = draft.company.currency || 'EUR'
  const perRep =
    namedReps.length > 0 ? draft.goals.monthlyTarget / namedReps.length : 0

  return (
    <StepShell
      title="Who carries the number?"
      description="Add the reps you manage. Their names are used for quota splits, leaderboards and the team view."
      onSkip={() => {
        setTeam([])
        goTo(5)
      }}
      skipLabel="I'll add them later"
      onSubmit={() => next()}
    >
      <div className="space-y-5">
        <TeamEditor team={draft.team} onChange={setTeam} errors={errors} />

        {namedReps.length > 0 && draft.goals.monthlyTarget > 0 ? (
          <p className="animate-fade-in text-xs text-ink-subtle">
            Split evenly, that is{' '}
            <span className="tnum text-ink-muted">
              {formatCurrency(perRep, { locale, currency, compactNumbers: false })}
            </span>{' '}
            per rep per month. You can give any rep their own quota later, in Settings.
          </p>
        ) : null}
      </div>
    </StepShell>
  )
}
