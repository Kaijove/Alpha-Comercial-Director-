import { COUNTRIES, SECTORS, findCountry } from '@/data/catalogs'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { LogoUploader } from '@/components/composite/LogoUploader'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toastContext'
import { SettingsSection } from '../SettingsSection'
import { useSectionForm } from '../useSectionForm'

const sectorOptions = SECTORS.map((sector) => ({ value: sector, label: sector }))
const countryOptions = COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
}))

export function CompanySection() {
  const { workspace, updateWorkspace } = useWorkspace()
  const { notify } = useToast()
  const form = useSectionForm(workspace!.company)

  const save = () => {
    updateWorkspace({ company: form.values })
    form.commit()
    notify({ title: 'Company details updated' })
  }

  return (
    <SettingsSection
      title="Company"
      description="The organisation this workspace reports on."
      dirty={form.dirty}
      onSave={save}
      onDiscard={form.discard}
    >
      <div className="space-y-6">
        <Input
          label="Company name"
          value={form.values.name}
          onChange={(event) => form.patch({ name: event.target.value })}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Sector"
            placeholder="Select a sector"
            options={sectorOptions}
            value={form.values.sector}
            onChange={(event) => form.patch({ sector: event.target.value })}
          />
          <Select
            label="Country"
            placeholder="Select a country"
            options={countryOptions}
            value={form.values.country}
            hint={
              findCountry(form.values.country)
                ? `Default currency ${findCountry(form.values.country)?.currency}`
                : undefined
            }
            onChange={(event) => form.patch({ country: event.target.value })}
          />
        </div>

        <Field label="Company logo" optional>
          <LogoUploader
            value={form.values.logo}
            companyName={form.values.name}
            onChange={(logo) => form.patch({ logo })}
          />
        </Field>
      </div>
    </SettingsSection>
  )
}
