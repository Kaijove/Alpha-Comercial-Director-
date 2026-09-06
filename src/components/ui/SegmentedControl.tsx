import { cn } from '@/lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-field border border-line bg-elevated p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-[7px] px-3 py-1.5 text-xs font-medium transition-colors duration-150',
              active
                ? 'bg-raised text-ink shadow-panel'
                : 'text-ink-subtle hover:text-ink-muted',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
