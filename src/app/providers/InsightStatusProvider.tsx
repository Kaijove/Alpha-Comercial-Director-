import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { localInsightRepository } from '@/data/repository/insightRepository'
import type { InsightStatus } from '@/domain/intelligence/types'
import {
  InsightStatusContext,
  type InsightStatusContextValue,
} from './insightStatusContext'

/**
 * What the director has decided about each insight.
 *
 * Separate from the commercial data on purpose: resolving or dismissing an
 * insight records a judgement about the signal, and must never touch the deal,
 * customer or rep it refers to.
 */
export function InsightStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => localInsightRepository.load())

  const setStatus = useCallback((insightId: string, status: InsightStatus) => {
    setState((current) => {
      const next = { ...current, [insightId]: { status, at: new Date().toISOString() } }
      localInsightRepository.save(next)
      return next
    })
  }, [])

  const reopen = useCallback((insightId: string) => {
    setState((current) => {
      const next = { ...current }
      delete next[insightId]
      localInsightRepository.save(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localInsightRepository.clear()
    setState({})
  }, [])

  const value = useMemo<InsightStatusContextValue>(() => {
    const statuses: Record<string, InsightStatus> = {}
    for (const [id, entry] of Object.entries(state)) statuses[id] = entry.status
    return { statuses, setStatus, reopen, clearAll }
  }, [state, setStatus, reopen, clearAll])

  return (
    <InsightStatusContext.Provider value={value}>{children}</InsightStatusContext.Provider>
  )
}
