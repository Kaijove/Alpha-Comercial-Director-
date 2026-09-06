import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Field, controlBase, controlTone } from './Field'
import { formatAmountInput, parseAmountInput } from '@/lib/format'

export interface AmountInputProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  value: number
  onChange: (value: number) => void
  symbol: string
  locale: string
  suffix?: ReactNode
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

/**
 * Currency amount field: grouped while typing, stored as a plain number.
 * Digits only — no decimals, because commercial targets are never cents.
 */
export function AmountInput({
  label,
  hint,
  error,
  value,
  onChange,
  symbol,
  locale,
  suffix,
  placeholder = '0',
  autoFocus,
  className,
}: AmountInputProps) {
  const id = useId()
  const display = value > 0 ? formatAmountInput(value, locale) : ''

  return (
    <Field id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-subtle">
          {symbol}
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={display}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            const parsed = parseAmountInput(event.target.value)
            onChange(parsed === '' ? 0 : parsed)
          }}
          className={cn(
            controlBase,
            controlTone(Boolean(error)),
            'tnum h-12 pl-10 text-lg font-medium tracking-tight',
            suffix && 'pr-20',
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">
            {suffix}
          </span>
        ) : null}
      </div>
    </Field>
  )
}
