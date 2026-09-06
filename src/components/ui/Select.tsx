import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Field, controlBase, controlTone } from './Field'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string
  optional?: boolean
  placeholder?: string
  options: SelectOption[]
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    optional,
    placeholder,
    options,
    className,
    containerClassName,
    id,
    value,
    ...props
  },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      className={containerClassName}
    >
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          value={value}
          aria-invalid={error ? true : undefined}
          className={cn(
            controlBase,
            controlTone(Boolean(error)),
            'h-10 appearance-none pr-9',
            !value && 'text-ink-faint',
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-elevated text-ink">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden
        />
      </div>
    </Field>
  )
})
