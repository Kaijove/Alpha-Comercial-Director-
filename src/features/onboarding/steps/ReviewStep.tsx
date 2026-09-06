import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { COUNTRIES, findCountry, findCurrency } from '@/data/catalogs'
import { Avatar } from '@/components/ui/Avatar'
import { formatCurrency } from '@/lib/format'
import { directorFullName, repInitials } from '@/domain/workspace'
import { StepShell } from '../components/StepShell'
import { useOnboarding } from '../onboardingContext'

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string
  value: ReactNode
  onEdit: () => void
}) {
  return (
    <div className="group flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 space-y-1">
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
          {label}
        </p>
        <div className="text-sm text-ink">{value}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-field px-2 py-1 text-xs text-ink-faint opacity-0 transition-all duration-150 hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Pencil className="size-3" />
        Edit
      </button>
    </div>
  )
}

export function ReviewStep({ onComplete }: { onComplete: () => void }) {
  const { draft, goTo } = useOnboarding()

  const locale = findCountry(draft.company.country)?.locale ?? 'en-US'
  const currency = draft.company.currency || 'EUR'
  const ctx = { locale, currency, compactNumbers: false }
  const country = COUNTRIES.find((item) => item.code === draft.company.country)
  const currencyMeta = findCurrency(currency)
  const namedReps = draft.team.filter((rep) => rep.name.trim().length > 0)

  return (
    <StepShell
      title="Does this look right?"
      description="Everything here can be changed later from Settings. Nothing leaves this browser."
      continueLabel="Create my workspace"
      onSubmit={onComplete}
      footnote="Takes a second"
    >
      <div className="divide-y divide-line rounded-panel border border-line bg-surface px-5">
        <ReviewRow
          label="Director"
          onEdit={() => goTo(1)}
          value={
            <span className="flex items-center gap-2.5">
              {directorFullName(draft.director)}
              <span className="text-ink-subtle">/</span>
              <span className="text-ink-muted">{draft.director.jobTitle}</span>
            </span>
          }
        />

        <ReviewRow
          label="Company"
          onEdit={() => goTo(2)}
          value={
            <span className="flex items-center gap-2.5">
              {draft.company.logo ? (
                <Avatar initials="" imageUrl={draft.company.logo} size="sm" />
              ) : null}
              <span>{draft.company.name}</span>
              <span className="text-ink-subtle">/</span>
              <span className="text-ink-muted">{draft.company.sector}</span>
            </span>
          }
        />

        <ReviewRow
          label="Market"
          onEdit={() => goTo(2)}
          value={
            <span className="text-ink-muted">
              {country?.name ?? 'Not set'}
              <span className="mx-2 text-ink-subtle">/</span>
              {currencyMeta ? `${currencyMeta.code} - ${currencyMeta.name}` : currency}
            </span>
          }
        />

        <ReviewRow
          label="Targets"
          onEdit={() => goTo(3)}
          value={
            <span className="tnum flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{formatCurrency(draft.goals.monthlyTarget, ctx)}</span>
              <span className="text-xs text-ink-subtle">monthly</span>
              <span className="text-ink-faint">/</span>
              <span>{formatCurrency(draft.goals.annualTarget, ctx)}</span>
              <span className="text-xs text-ink-subtle">annual</span>
            </span>
          }
        />

        <ReviewRow
          label="Sales team"
          onEdit={() => goTo(4)}
          value={
            namedReps.length === 0 ? (
              <span className="text-ink-muted">No reps yet - you can add them later</span>
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                {namedReps.slice(0, 8).map((rep) => (
                  <span
                    key={rep.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-elevated py-1 pl-1 pr-2.5 text-body"
                  >
                    <Avatar initials={repInitials(rep.name)} accent={rep.accent} size="sm" />
                    {rep.name}
                  </span>
                ))}
                {namedReps.length > 8 ? (
                  <span className="text-body text-ink-muted">
                    +{namedReps.length - 8} more
                  </span>
                ) : null}
              </span>
            )
          }
        />
      </div>
    </StepShell>
  )
}
