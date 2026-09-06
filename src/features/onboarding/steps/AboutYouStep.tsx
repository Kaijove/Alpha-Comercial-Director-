import { JOB_TITLE_SUGGESTIONS } from '@/data/catalogs'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Input } from '@/components/ui/Input'
import { StepShell } from '../components/StepShell'
import { useOnboarding } from '../onboardingContext'

export function AboutYouStep() {
  const { draft, errors, setDirector, clearError } = useOnboarding()

  return (
    <StepShell
      title="First, who are we setting this up for?"
      description="Your name appears on the morning briefing and on everything you share with your team."
      footnote="Stored on this device only"
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            value={draft.director.firstName}
            autoFocus
            autoComplete="given-name"
            placeholder="Marc"
            error={errors.firstName}
            onChange={(event) => {
              setDirector({ firstName: event.target.value })
              clearError('firstName')
            }}
          />
          <Input
            label="Last name"
            value={draft.director.lastName}
            autoComplete="family-name"
            placeholder="Ferrer"
            error={errors.lastName}
            onChange={(event) => {
              setDirector({ lastName: event.target.value })
              clearError('lastName')
            }}
          />
        </div>

        <div className="space-y-3">
          <Input
            label="Job title"
            value={draft.director.jobTitle}
            autoComplete="organization-title"
            placeholder="Sales Director"
            error={errors.jobTitle}
            onChange={(event) => {
              setDirector({ jobTitle: event.target.value })
              clearError('jobTitle')
            }}
          />
          <ChipGroup
            options={JOB_TITLE_SUGGESTIONS}
            value={draft.director.jobTitle}
            onSelect={(option) => {
              setDirector({ jobTitle: option })
              clearError('jobTitle')
            }}
          />
        </div>
      </div>
    </StepShell>
  )
}
