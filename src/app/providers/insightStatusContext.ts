import { createContext, useContext } from 'react'
import type { InsightStatus } from '@/domain/intelligence/types'

export interface InsightStatusContextValue {
  /** Insight id to the status the director last set. */
  statuses: Record<string, InsightStatus>
  setStatus: (insightId: string, status: InsightStatus) => void
  /** Back to 'new', for an insight that was closed too early. */
  reopen: (insightId: string) => void
  clearAll: () => void
}

/** Kept apart from the provider component so hot reloads never break it. */
export const InsightStatusContext = createContext<InsightStatusContextValue | null>(null)

export function useInsightStatus(): InsightStatusContextValue {
  const context = useContext(InsightStatusContext)
  if (!context) {
    throw new Error('useInsightStatus must be used inside <InsightStatusProvider>.')
  }
  return context
}
