import { useState } from 'react'
import { REP_ROLES } from '@/data/catalogs'
import { REGIONS } from '@/data/seed/dictionaries'
import type { SalesRep, Workspace } from '@/domain/workspace'
import { repMonthlyTarget, repAnnualTarget } from '@/domain/metrics/repTargets'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { currencySymbol } from '@/lib/format'
import { useFormatters } from '@/hooks/useFormatters'

export interface RepDraft {
  name: string
  role: string
  region: string
  email: string
  /** False means "an equal share of the team target". */
  customTargets: boolean
  monthlyTarget: number
  annualTarget: number
}

export function draftFromRep(rep: SalesRep, workspace: Workspace): RepDraft {
  return {
    name: rep.name,
    role: rep.role,
    region: rep.region ?? '',
    email: rep.email ?? '',
    customTargets: rep.monthlyTarget !== null || rep.annualTarget !== null,
    monthlyTarget: rep.monthlyTarget ?? Math.round(repMonthlyTarget(rep, workspace)),
    annualTarget: rep.annualTarget ?? Math.round(repAnnualTarget(rep, workspace)),
  }
}

export function emptyRepDraft(workspace: Workspace): RepDraft {
  const size = Math.max(1, workspace.team.length + 1)
  return {
    name: '',
    role: REP_ROLES[0],
    region: '',
    email: '',
    customTargets: false,
    monthlyTarget: Math.round(workspace.goals.monthlyTarget / size),
    annualTarget: Math.round(
      (workspace.goals.annualTarget > 0
        ? workspace.goals.annualTarget
        : workspace.goals.monthlyTarget * 12) / size,
    ),
  }
}

/**
 * Add and edit share one form.
 *
 * Targets are opt-in: a rep carries an equal share of the team commitment until
 * a quota is set for them, at which point the figure is honoured literally.
 * Historical revenue is never editable here - it is derived from won deals.
 */
export function RepFormPanel({
  mode,
  draft: initial,
  onSubmit,
  onClose,
}: {
  mode: 'create' | 'edit'
  draft: RepDraft
  onSubmit: (draft: RepDraft) => void
  onClose: () => void
}) {
  const fmt = useFormatters()
  const [draft, setDraft] = useState<RepDraft>(initial)
  const [error, setError] = useState<string | undefined>()

  const symbol = currencySymbol(fmt.locale, fmt.currencyCode)
  const patch = (next: Partial<RepDraft>) =>
    setDraft((current) => ({ ...current, ...next }))

  const submit = () => {
    if (draft.name.trim().length < 2) {
      setError('Enter the rep name.')
      return
    }
    onSubmit(draft)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === 'create' ? 'Add sales rep' : 'Edit sales rep'}
      description={
        mode === 'create'
          ? 'They appear in the ranking, the filters and the pipeline owner selector straight away.'
          : draft.name
      }
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={submit}>
            {mode === 'create' ? 'Add sales rep' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Input
          label="Name"
          value={draft.name}
          autoFocus={mode === 'create'}
          placeholder="Laia Puig"
          error={error}
          onChange={(event) => {
            patch({ name: event.target.value })
            setError(undefined)
          }}
        />

        <Select
          label="Role"
          value={draft.role}
          options={REP_ROLES.map((role) => ({ value: role, label: role }))}
          onChange={(event) => patch({ role: event.target.value })}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Region"
            optional
            placeholder="No region"
            value={draft.region}
            options={REGIONS.map((region) => ({ value: region, label: region }))}
            onChange={(event) => patch({ region: event.target.value })}
          />
          <Input
            label="Email"
            optional
            type="email"
            value={draft.email}
            placeholder="name@company.com"
            onChange={(event) => patch({ email: event.target.value })}
          />
        </div>

        <div className="space-y-4 rounded-panel border border-line bg-surface p-4">
          <Toggle
            checked={draft.customTargets}
            onChange={(checked) => patch({ customTargets: checked })}
            label="Set an individual quota"
            description="Off, this rep carries an equal share of the team target."
          />

          {draft.customTargets ? (
            <div className="grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
              <AmountInput
                label="Monthly target"
                value={draft.monthlyTarget}
                symbol={symbol}
                locale={fmt.locale}
                suffix="per month"
                onChange={(value) => patch({ monthlyTarget: value })}
              />
              <AmountInput
                label="Annual target"
                value={draft.annualTarget}
                symbol={symbol}
                locale={fmt.locale}
                suffix="per year"
                onChange={(value) => patch({ annualTarget: value })}
              />
            </div>
          ) : null}
        </div>

        <Field label="Historical performance">
          <p className="rounded-field border border-line bg-elevated p-3 text-xs leading-relaxed text-ink-subtle">
            Revenue, win rate and pipeline are derived from this rep&apos;s opportunities and
            cannot be edited here. Change a deal in the Pipeline and the figures follow.
          </p>
        </Field>
      </form>
    </Drawer>
  )
}
