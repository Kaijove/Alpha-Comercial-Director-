import { COUNTRIES, CURRENCIES, SECTORS, findCountry } from '@/data/catalogs'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LogoUploader } from '@/components/composite/LogoUploader'
import { StepShell } from '../components/StepShell'
import { useOnboarding } from '../onboardingContext'

const sectorOptions = SECTORS.map((sector) => ({ value: sector, label: sector }))
const countryOptions = COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
}))
const currencyOptions = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}))

export function CompanyStep() {
  const { draft, errors, setCompany, clearError } = useOnboarding()

  /** Selecting a country pre-fills the reporting currency; it stays editable. */
  const handleCountry = (code: string) => {
    const country = findCountry(code)
    setCompany({
      country: code,
      currency: draft.company.currency || country?.currency || '',
    })
    clearError('country')
    clearError('currency')
  }

  return (
    <StepShell
      title="Tell us about the business"
      description="This shapes how figures are labelled and formatted across the command center."
    >
      <div className="space-y-6">
        <Input
          label="Company name"
          value={draft.company.name}
          autoFocus
          autoComplete="organization"
          placeholder="ACME Industrial"
          error={errors.name}
          onChange={(event) => {
            setCompany({ name: event.target.value })
            clearError('name')
          }}
        />

        <Select
          label="Sector"
          placeholder="Select a sector"
          options={sectorOptions}
          value={draft.company.sector}
          error={errors.sector}
          onChange={(event) => {
            setCompany({ sector: event.target.value })
            clearError('sector')
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Country"
            placeholder="Select a country"
            options={countryOptions}
            value={draft.company.country}
            error={errors.country}
            onChange={(event) => handleCountry(event.target.value)}
          />
          <Select
            label="Reporting currency"
            placeholder="Select a currency"
            options={currencyOptions}
            value={draft.company.currency}
            error={errors.currency}
            hint="Every target and figure is shown in this currency."
            onChange={(event) => {
              setCompany({ currency: event.target.value })
              clearError('currency')
            }}
          />
        </div>

        <Field label="Company logo" optional>
          <LogoUploader
            value={draft.company.logo}
            companyName={draft.company.name}
            onChange={(logo) => setCompany({ logo })}
          />
        </Field>
      </div>
    </StepShell>
  )
}
