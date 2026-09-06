import { JOB_TITLE_SUGGESTIONS } from '@/data/catalogs'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { Avatar } from '@/components/ui/Avatar'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/toastContext'
import { directorFullName, directorInitials } from '@/domain/workspace'
import { SettingsSection } from '../SettingsSection'
import { useSectionForm } from '../useSectionForm'

export function ProfileSection() {
  const { workspace, updateWorkspace } = useWorkspace()
  const { notify } = useToast()
  const form = useSectionForm(workspace!.director)

  const save = () => {
    updateWorkspace({ director: form.values })
    form.commit()
    notify({ title: 'Profile updated' })
  }

  return (
    <SettingsSection
      title="Your profile"
      description="How you are addressed across the command center."
      dirty={form.dirty}
      onSave={save}
      onDiscard={form.discard}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-panel border border-line bg-surface p-4">
          <Avatar initials={directorInitials(form.values)} accent={0} size="lg" />
          <div>
            <p className="text-sm font-medium text-ink">
              {directorFullName(form.values) || 'Your name'}
            </p>
            <p className="text-body text-ink-muted">
              {form.values.jobTitle || 'Your job title'}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="First name"
            value={form.values.firstName}
            onChange={(event) => form.patch({ firstName: event.target.value })}
          />
          <Input
            label="Last name"
            value={form.values.lastName}
            onChange={(event) => form.patch({ lastName: event.target.value })}
          />
        </div>

        <div className="space-y-3">
          <Input
            label="Job title"
            value={form.values.jobTitle}
            onChange={(event) => form.patch({ jobTitle: event.target.value })}
          />
          <ChipGroup
            options={JOB_TITLE_SUGGESTIONS}
            value={form.values.jobTitle}
            onSelect={(option) => form.patch({ jobTitle: option })}
          />
        </div>
      </div>
    </SettingsSection>
  )
}
