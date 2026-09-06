import { readJson, removeRaw, writeJson } from '@/lib/storage'
import type { InsightStatus } from '@/domain/intelligence/types'

export const INSIGHT_STATUS_KEY = 'insight-status'

export interface StoredInsightState {
  status: InsightStatus
  /** When the director last acted on it. */
  at: string
}

export type InsightStateMap = Record<string, StoredInsightState>

/**
 * Insight state, kept apart from the commercial data.
 *
 * Dismissing an insight is a statement about the *insight*, never about the
 * deal, the customer or the rep behind it - so nothing here can ever delete or
 * modify business data. If the underlying condition persists, the rule fires
 * again with the same stable id and finds the decision the director already
 * made.
 */
export const localInsightRepository = {
  load(): InsightStateMap {
    const stored = readJson<InsightStateMap>(INSIGHT_STATUS_KEY)
    if (!stored || typeof stored !== 'object') return {}
    return stored
  },

  save(state: InsightStateMap): boolean {
    return writeJson(INSIGHT_STATUS_KEY, state)
  },

  clear(): void {
    removeRaw(INSIGHT_STATUS_KEY)
  },
}
