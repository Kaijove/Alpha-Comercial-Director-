import { COUNTRIES } from '@/data/catalogs'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/toastContext'
import { Field } from '@/components/ui/Field'
import { MONTHS, formatCurrency, formatDate } from '@/lib/format'
import type { FiscalYearStart, Preferences } from '@/domain/workspace'
import { SettingsSection } from '../SettingsSection'
import { useSectionForm } from '../useSectionForm'

const localeOptions = Array.from(
  new Map(COUNTRIES.map((country) => [country.locale, country])).values(),
).map((country) => ({
  value: country.locale,
  label: `${country.name} (${country.locale})`,
}))

const monthOptions = MONTHS.map((month, index) => ({
  value: String(index + 1),
  label: month,
}))

export function PreferencesSection() {
  const { workspace, updateWorkspace } = useWorkspace()
  const { notify } = useToast()
  const form = useSectionForm<Preferences>(workspace!.preferences)

  const previewContext = {
    locale: form.values.locale,
    currency: workspace!.company.currency,
    compactNumbers: form.values.compactNumbers,
  }

  const save = () => {
    updateWorkspace({ preferences: form.values })
    form.commit()
    notify({ title: 'Preferences updated' })
  }

  return (
    <SettingsSection
      title="Preferences"
      description="How dates and figures are rendered, and where your commercial year starts."
      dirty={form.dirty}
      onSave={save}
      onDiscard={form.discard}
    >
      <div className="space-y-7">
        <Select
          label="Number and date format"
          options={localeOptions}
          value={form.values.locale}
          hint="Only affects formatting. The interface stays in English."
          onChange={(event) => form.patch({ locale: event.target.value })}
        />

        <Select
          label="Fiscal year starts in"
          options={monthOptions}
          value={String(form.values.fiscalYearStart)}
          hint="Used by year-to-date figures and the annual target pacing."
          onChange={(event) =>
            form.patch({ fiscalYearStart: Number(event.target.value) as FiscalYearStart })
          }
        />

        <Field label="Week starts on">
          <SegmentedControl
            value={form.values.weekStartsOn}
            onChange={(value) => form.patch({ weekStartsOn: value })}
            options={[
              { value: 'monday', label: 'Monday' },
              { value: 'sunday', label: 'Sunday' },
            ]}
          />
        </Field>

        <div className="rounded-panel border border-line bg-surface p-4">
          <Toggle
            checked={form.values.compactNumbers}
            onChange={(checked) => form.patch({ compactNumbers: checked })}
            label="Compact large figures"
            description="Show 1.2M instead of 1,200,000 on tiles and charts."
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4">
            <span className="text-2xs uppercase tracking-[0.12em] text-ink-faint">
              Preview
            </span>
            <span className="tnum text-body text-ink">
              {formatCurrency(1_248_500, previewContext)}
            </span>
            <span className="text-body text-ink-muted">
              {formatDate(new Date(), form.values.locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}
