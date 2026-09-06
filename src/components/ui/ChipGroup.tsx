import { cn } from '@/lib/cn'

/** Quick-pick suggestions that fill an adjacent input. */
export function ChipGroup({
  options,
  value,
  onSelect,
  className,
}: {
  options: string[]
  value?: string
  onSelect: (option: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs transition-colors duration-150',
              active
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-line bg-elevated text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
