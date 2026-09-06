import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  id?: string
  label?: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: ReactNode
}

export function Field({
  id,
  label,
  hint,
  error,
  optional = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-body font-medium text-ink">
            {label}
          </label>
          {optional ? (
            <span className="text-2xs uppercase tracking-[0.1em] text-ink-faint">
              Optional
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="animate-fade-in text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

export const controlBase =
  'w-full rounded-field border bg-elevated px-3 text-sm text-ink placeholder:text-ink-faint ' +
  'transition-[border-color,box-shadow,background-color] duration-150 outline-none ' +
  'focus:border-accent/70 focus:ring-4 focus:ring-accent/10 focus:bg-raised ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

export const controlTone = (hasError?: boolean) =>
  hasError ? 'border-negative/60 focus:border-negative/70 focus:ring-negative/10' : 'border-line'
