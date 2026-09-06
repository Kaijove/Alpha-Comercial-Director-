import { useCallback, useMemo, useState } from 'react'

/**
 * Local editing buffer for a settings section.
 *
 * Nothing is written to the workspace until `Save changes` is pressed, so a
 * half-typed target never reaches the dashboard.
 */
export function useSectionForm<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [baseline, setBaseline] = useState<T>(initial)

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline),
    [values, baseline],
  )

  const patch = useCallback((next: Partial<T>) => {
    setValues((current) => ({ ...current, ...next }))
  }, [])

  const commit = useCallback(() => setBaseline(values), [values])
  const discard = useCallback(() => setValues(baseline), [baseline])

  return { values, setValues, patch, dirty, commit, discard }
}
