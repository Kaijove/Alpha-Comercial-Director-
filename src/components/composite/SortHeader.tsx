import { ArrowDown, ArrowUp } from 'lucide-react'
import type { SortDirection } from '@/hooks/useSortable'
import { cn } from '@/lib/cn'

export interface SortHeaderProps<K extends string> {
  label: string
  columnKey: K
  active: boolean
  direction: SortDirection
  onSort: (key: K) => void
  align?: 'left' | 'right'
  className?: string
}

/** Column header that makes its sortability obvious before it is used. */
export function SortHeader<K extends string>({
  label,
  columnKey,
  active,
  direction,
  onSort,
  align = 'right',
  className,
}: SortHeaderProps<K>) {
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <th scope="col" className={cn('font-normal', className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={cn(
          'group inline-flex w-full items-center gap-1 rounded px-1 py-1 text-2xs font-medium uppercase tracking-[0.1em] transition-colors',
          align === 'right' ? 'justify-end' : 'justify-start',
          active ? 'text-ink' : 'text-ink-subtle hover:text-ink-muted',
        )}
      >
        {label}
        <Icon
          className={cn(
            'size-3 transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
          )}
          aria-hidden
        />
      </button>
    </th>
  )
}
