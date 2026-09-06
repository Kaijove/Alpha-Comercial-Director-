import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: ToggleProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-6 rounded-field px-1 py-1',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className="space-y-1">
        <span className="block text-body font-medium text-ink">{label}</span>
        {description ? (
          <span className="block text-xs leading-relaxed text-ink-subtle">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-accent/40 bg-accent/80' : 'border-line-strong bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-ink transition-[left] duration-200 ease-out-soft',
            checked ? 'left-[18px] bg-accent-ink' : 'left-[2px] bg-ink-subtle',
          )}
        />
      </button>
    </label>
  )
}
