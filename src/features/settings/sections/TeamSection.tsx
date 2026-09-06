import { useWorkspace } from '@/app/providers/workspaceContext'
import { TeamEditor } from '@/components/composite/TeamEditor'
import { useToast } from '@/components/ui/toastContext'
import { formatCurrency } from '@/lib/format'
import type { SalesRep } from '@/domain/workspace'
import { SettingsSection } from '../SettingsSection'
import { useSectionForm } from '../useSectionForm'

export function TeamSection() {
  const { workspace, updateWorkspace, format } = useWorkspace()
  const { notify } = useToast()
  const form = useSectionForm<{ team: SalesRep[] }>({ team: workspace!.team })

  const named = form.values.team.filter((rep) => rep.name.trim().length > 0)
  const perRep =
    named.length > 0 ? workspace!.goals.monthlyTarget / named.length : 0

  const save = () => {
    const cleaned = form.values.team.filter((rep) => rep.name.trim().length > 0)
    updateWorkspace({ team: cleaned })
    form.setValues({ team: cleaned })
    form.commit()
    notify({
      title: 'Sales team updated',
      description: `${cleaned.length} ${cleaned.length === 1 ? 'rep' : 'reps'} in the roster.`,
    })
  }

  return (
    <SettingsSection
      title="Sales team"
      description="The reps you manage. Empty rows are dropped when you save."
      dirty={form.dirty}
      onSave={save}
      onDiscard={form.discard}
    >
      <div className="space-y-5">
        <TeamEditor team={form.values.team} onChange={(team) => form.setValues({ team })} />

        {named.length > 0 && workspace!.goals.monthlyTarget > 0 ? (
          <p className="text-xs text-ink-subtle">
            Split evenly, that is{' '}
            <span className="tnum text-ink-muted">{formatCurrency(perRep, format)}</span> per
            rep per month.
          </p>
        ) : null}
      </div>
    </SettingsSection>
  )
}
