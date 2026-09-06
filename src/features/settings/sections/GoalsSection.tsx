import { Wand2 } from 'lucide-react'
import { CURRENCIES } from '@/data/catalogs'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toastContext'
import { currencySymbol, formatCurrency } from '@/lib/format'
import { SettingsSection } from '../SettingsSection'
import { useSectionForm } from '../useSectionForm'

const currencyOptions = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}))

export function GoalsSection() {
  const { workspace, updateWorkspace } = useWorkspace()
  const { notify } = useToast()

  const form = useSectionForm({
    monthlyTarget: workspace!.goals.monthlyTarget,
    annualTarget: workspace!.goals.annualTarget,
    currency: workspace!.company.currency,
  })

  const locale = workspace!.preferences.locale
  const symbol = currencySymbol(locale, form.values.currency)
  const ctx = { locale, currency: form.values.currency, compactNumbers: false }
  const projected = form.values.monthlyTarget * 12

  const save = () => {
    updateWorkspace({
      goals: {
        monthlyTarget: form.values.monthlyTarget,
        annualTarget: form.values.annualTarget,
      },
      company: { currency: form.values.currency },
    })
    form.commit()
    notify({ title: 'Targets updated' })
  }

  return (
    <SettingsSection
      title="Goals & currency"
      description="The numbers every gauge, forecast and alert is measured against."
      dirty={form.dirty}
      onSave={save}
      onDiscard={form.discard}
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <AmountInput
            label="Monthly target"
            value={form.values.monthlyTarget}
            symbol={symbol}
            locale={locale}
            suffix="per month"
            onChange={(value) => form.patch({ monthlyTarget: value })}
          />
          <AmountInput
            label="Annual target"
            value={form.values.annualTarget}
            symbol={symbol}
            locale={locale}
            suffix="per year"
            onChange={(value) => form.patch({ annualTarget: value })}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface p-4">
          <p className="text-body text-ink-muted">
            Twelve months at the monthly target is{' '}
            <span className="tnum font-medium text-ink">
              {formatCurrency(projected, ctx)}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => form.patch({ annualTarget: projected })}
            iconLeft={<Wand2 className="size-3.5" />}
          >
            Use 12x monthly
          </Button>
        </div>

        <Select
          label="Reporting currency"
          options={currencyOptions}
          value={form.values.currency}
          hint="Changing this re-formats every figure in the workspace."
          onChange={(event) => form.patch({ currency: event.target.value })}
        />
      </div>
    </SettingsSection>
  )
}
