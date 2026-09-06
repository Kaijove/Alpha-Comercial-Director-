import { useCallback, useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

/**
 * Sorting for the analytics tables.
 *
 * Values are pulled through an accessor map so a column can sort on something
 * other than what it displays (a formatted string would sort alphabetically).
 * Nulls always sink to the bottom, whichever direction is active.
 */
export function useSortable<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => number | string | null>,
  initial: SortState<K>,
) {
  const [sort, setSort] = useState<SortState<K>>(initial)

  const toggle = useCallback((key: K) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' }
        : { key, direction: 'desc' },
    )
  }, [])

  const sorted = useMemo(() => {
    const accessor = accessors[sort.key]
    const factor = sort.direction === 'asc' ? 1 : -1

    return [...rows].sort((a, b) => {
      const left = accessor(a)
      const right = accessor(b)

      if (left === null && right === null) return 0
      if (left === null) return 1
      if (right === null) return -1

      if (typeof left === 'string' || typeof right === 'string') {
        return String(left).localeCompare(String(right)) * factor
      }
      return (left - right) * factor
    })
    // `accessors` is a literal rebuilt on every render; the rows and sort state
    // are what actually change the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort])

  return { sorted, sort, toggle }
}
