import { useState } from 'react'
import {
  STAGES,
  STAGE_DEFAULT_PROBABILITY,
  STAGE_LABELS,
  type Stage,
} from '@/domain/commerce'
import { DEAL_SOURCES } from '@/data/seed/dictionaries'
import type { OpportunityDraft } from '@/domain/pipeline/opportunityMutations'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { AmountInput } from '@/components/ui/AmountInput'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Field, controlBase, controlTone } from '@/components/ui/Field'
import { currencySymbol } from '@/lib/format'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

export interface DealFormPanelProps {
  mode: 'create' | 'edit'
  draft: OpportunityDraft
  products: string[]
  onSubmit: (draft: OpportunityDraft) => void
  onClose: () => void
}

type Errors = Partial<Record<'name' | 'value' | 'expectedCloseDate', string>>

function validate(draft: OpportunityDraft): Errors {
  const errors: Errors = {}
  if (draft.name.trim().length < 2) errors.name = 'Give the opportunity a name.'
  if (!(draft.value > 0)) errors.value = 'Set a value above zero.'
  if (!draft.expectedCloseDate) errors.expectedCloseDate = 'Pick an expected close date.'
  return errors
}

/**
 * Create and edit share one form.
 *
 * The probability follows the stage default until it is touched; from that
 * point it is marked manual and survives every later stage change, including a
 * drag on the board.
 */
export function DealFormPanel({
  mode,
  draft: initialDraft,
  products,
  onSubmit,
  onClose,
}: DealFormPanelProps) {
  const { dataset } = useCommercialData()
  const fmt = useFormatters()
  const [draft, setDraft] = useState<OpportunityDraft>(initialDraft)
  const [errors, setErrors] = useState<Errors>({})

  const symbol = currencySymbol(fmt.locale, fmt.currencyCode)
  const patch = (next: Partial<OpportunityDraft>) =>
    setDraft((current) => ({ ...current, ...next }))

  const handleStage = (stage: Stage) => {
    patch({
      stage,
      // Only realign the probability while it is still following the stage.
      probability: draft.probabilityIsManual
        ? draft.probability
        : STAGE_DEFAULT_PROBABILITY[stage],
    })
  }

  const submit = () => {
    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(draft)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={mode === 'create' ? 'New opportunity' : 'Edit opportunity'}
      description={
        mode === 'create'
          ? 'It appears on the board and in every figure as soon as you save.'
          : draft.name
      }
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={submit}>
            {mode === 'create' ? 'Create opportunity' : 'Save changes'}
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
          label="Deal name"
          value={draft.name}
          autoFocus={mode === 'create'}
          placeholder="Production line upgrade"
          error={errors.name}
          onChange={(event) => {
            patch({ name: event.target.value })
            setErrors((current) => ({ ...current, name: undefined }))
          }}
        />

        <Select
          label="Customer"
          value={draft.customerId}
          options={dataset.customers.map((customer) => ({
            value: customer.id,
            label: customer.name,
          }))}
          onChange={(event) => patch({ customerId: event.target.value })}
        />

        <Select
          label="Owner"
          value={draft.ownerId}
          options={dataset.owners.map((owner) => ({
            value: owner.id,
            label: owner.name,
          }))}
          onChange={(event) => patch({ ownerId: event.target.value })}
        />

        <AmountInput
          label="Value"
          value={draft.value}
          symbol={symbol}
          locale={fmt.locale}
          error={errors.value}
          onChange={(value) => {
            patch({ value })
            setErrors((current) => ({ ...current, value: undefined }))
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Stage"
            value={draft.stage}
            options={STAGES.map((stage) => ({
              value: stage,
              label: STAGE_LABELS[stage],
            }))}
            onChange={(event) => handleStage(event.target.value as Stage)}
          />

          <Field
            label="Probability"
            hint={
              draft.probabilityIsManual
                ? 'Set by hand; stage changes will not overwrite it.'
                : `Following the ${STAGE_LABELS[draft.stage]} default.`
            }
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(draft.probability * 100)}
                aria-label="Probability"
                onChange={(event) =>
                  patch({
                    probability: Number(event.target.value) / 100,
                    probabilityIsManual: true,
                  })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-accent"
              />
              <span className="tnum w-11 shrink-0 text-right text-body font-medium text-ink">
                {Math.round(draft.probability * 100)}%
              </span>
            </div>
          </Field>
        </div>

        <Field label="Expected close" error={errors.expectedCloseDate}>
          <input
            type="date"
            value={draft.expectedCloseDate}
            onChange={(event) => {
              patch({ expectedCloseDate: event.target.value })
              setErrors((current) => ({ ...current, expectedCloseDate: undefined }))
            }}
            className={cn(
              controlBase,
              controlTone(Boolean(errors.expectedCloseDate)),
              'h-10',
            )}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Product"
            optional
            value={draft.product}
            options={products.map((product) => ({ value: product, label: product }))}
            onChange={(event) => patch({ product: event.target.value })}
          />
          <Select
            label="Source"
            optional
            value={draft.source}
            options={DEAL_SOURCES.map((source) => ({ value: source, label: source }))}
            onChange={(event) => patch({ source: event.target.value })}
          />
        </div>

        <Field label="Notes" optional>
          <textarea
            rows={4}
            value={draft.notes}
            placeholder="Context worth remembering before the next conversation."
            onChange={(event) => patch({ notes: event.target.value })}
            className={cn(controlBase, controlTone(false), 'resize-y py-2.5 leading-relaxed')}
          />
        </Field>
      </form>
    </Drawer>
  )
}
