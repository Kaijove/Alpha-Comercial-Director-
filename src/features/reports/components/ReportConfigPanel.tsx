import { Check } from 'lucide-react'
import { REPORT_PERIOD_OPTIONS, type CustomRange, type ReportPeriodKey } from '@/domain/reports/reportPeriods'
import {
  REPORT_SECTIONS,
  REPORT_TYPES,
  type ReportConfig,
  type ReportSectionKey,
  type ReportType,
} from '@/domain/reports/types'
import type { Owner } from '@/domain/commerce'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Select } from '@/components/ui/Select'
import { Field } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

/**
 * Choosing what the report contains.
 *
 * Picking a type sets the sections that type is made of; the toggles are there
 * to trim, not to assemble a report from nothing. Two decisions, one optional
 * adjustment - which is as complex as this needs to be.
 */
export function ReportConfigPanel({
  config,
  owners,
  onType,
  onPeriod,
  onCustomRange,
  onOwner,
  onToggleSection,
}: {
  config: ReportConfig
  owners: Owner[]
  onType: (type: ReportType) => void
  onPeriod: (period: ReportPeriodKey) => void
  onCustomRange: (range: CustomRange) => void
  onOwner: (ownerId: string | null) => void
  onToggleSection: (section: ReportSectionKey) => void
}) {
  const custom = config.custom ?? { from: '', to: '' }

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Report"
        description="Choose what to produce, over which period, and for whom."
      />

      <div className="mt-5 space-y-2">
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Report type
        </p>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2">
          {REPORT_TYPES.map((type) => {
            const active = type.value === config.type
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => onType(type.value)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col gap-1 bg-surface p-4 text-left transition-colors',
                  active ? 'bg-elevated' : 'hover:bg-elevated/60',
                )}
              >
                <span className="flex items-center gap-2 text-body font-medium text-ink">
                  {active ? (
                    <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                  {type.label}
                </span>
                <span className="pl-[22px] text-xs leading-relaxed text-ink-faint">
                  {type.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Period"
          value={config.period}
          onChange={(event) => onPeriod(event.target.value as ReportPeriodKey)}
          options={REPORT_PERIOD_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
        <Select
          label="Scope"
          value={config.ownerId ?? ''}
          onChange={(event) => onOwner(event.target.value || null)}
          options={[
            { value: '', label: 'Whole team' },
            ...owners.map((owner) => ({ value: owner.id, label: owner.name })),
          ]}
        />
      </div>

      {config.period === 'custom' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="From">
            <input
              type="date"
              value={custom.from}
              onChange={(event) => onCustomRange({ ...custom, from: event.target.value })}
              className="h-10 w-full rounded-field border border-line bg-elevated px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              value={custom.to}
              onChange={(event) => onCustomRange({ ...custom, to: event.target.value })}
              className="h-10 w-full rounded-field border border-line bg-elevated px-3 text-sm text-ink outline-none transition-colors focus:border-accent"
            />
          </Field>
        </div>
      ) : null}

      <div className="mt-6 space-y-2">
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Sections
        </p>
        <ul className="space-y-px overflow-hidden rounded-panel border border-line bg-line">
          {REPORT_SECTIONS.map((section) => {
            const enabled = config.sections.includes(section.key)
            return (
              <li key={section.key}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => onToggleSection(section.key)}
                  className="flex w-full items-center gap-3 bg-surface px-4 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                      enabled
                        ? 'border-accent bg-accent text-accent-ink'
                        : 'border-line-strong bg-transparent',
                    )}
                  >
                    {enabled ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-ink">{section.label}</span>
                    <span className="block truncate text-xs text-ink-faint">
                      {section.description}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )
}
