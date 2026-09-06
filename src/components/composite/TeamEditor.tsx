import { Plus, UserPlus, X } from 'lucide-react'
import { REP_ROLES } from '@/data/catalogs'
import { createRep } from '@/domain/defaults'
import { repInitials, type SalesRep } from '@/domain/workspace'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { controlBase, controlTone } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

export interface TeamEditorProps {
  team: SalesRep[]
  onChange: (team: SalesRep[]) => void
  /** Keyed by `team.<index>`; produced by the onboarding validators. */
  errors?: Record<string, string>
  className?: string
}

/**
 * Shared roster editor. Used by the onboarding "Sales team" step and by
 * Settings > Sales team so both stay in sync by construction.
 */
export function TeamEditor({ team, onChange, errors = {}, className }: TeamEditorProps) {
  const update = (id: string, patch: Partial<SalesRep>) => {
    onChange(team.map((rep) => (rep.id === id ? { ...rep, ...patch } : rep)))
  }

  const remove = (id: string) => {
    onChange(team.filter((rep) => rep.id !== id))
  }

  const add = (count = 1) => {
    const additions = Array.from({ length: count }, (_, index) =>
      createRep('', '', team.length + index),
    )
    onChange([...team, ...additions])
  }

  return (
    <div className={cn('space-y-4', className)}>
      {team.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="size-4" />}
          title="No sales reps yet"
          description="Add the people who carry a quota. You can always change the roster later from Settings."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button type="button" variant="primary" size="sm" onClick={() => add(1)}>
                Add a sales rep
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => add(3)}>
                Add 3 rows
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
              Roster
            </p>
            <p className="tnum text-xs text-ink-faint">
              {team.length} {team.length === 1 ? 'rep' : 'reps'}
            </p>
          </div>

          <ul className="space-y-2">
            {team.map((rep, index) => {
              const error = errors[`team.${index}`]
              return (
                <li key={rep.id} className="animate-fade-in space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      initials={repInitials(rep.name)}
                      accent={rep.accent}
                      size="md"
                      className="hidden sm:inline-flex"
                    />

                    <input
                      value={rep.name}
                      onChange={(event) => update(rep.id, { name: event.target.value })}
                      placeholder={`Sales rep ${index + 1}`}
                      autoComplete="off"
                      className={cn(controlBase, controlTone(Boolean(error)), 'h-10 flex-1')}
                    />

                    <select
                      value={rep.role}
                      onChange={(event) => update(rep.id, { role: event.target.value })}
                      className={cn(
                        controlBase,
                        controlTone(false),
                        'h-10 w-[168px] shrink-0 appearance-none pr-8 text-body',
                        !rep.role && 'text-ink-faint',
                      )}
                    >
                      <option value="">Role (optional)</option>
                      {REP_ROLES.map((role) => (
                        <option key={role} value={role} className="bg-elevated text-ink">
                          {role}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => remove(rep.id)}
                      aria-label={`Remove ${rep.name || `sales rep ${index + 1}`}`}
                      className="shrink-0 rounded-field p-2 text-ink-faint transition-colors hover:bg-negative/10 hover:text-negative"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  {error ? <p className="pl-0 text-xs text-negative sm:pl-[46px]">{error}</p> : null}
                </li>
              )
            })}
          </ul>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => add(1)}
            iconLeft={<Plus className="size-3.5" />}
          >
            Add sales rep
          </Button>
        </>
      )}
    </div>
  )
}
