import { readJson, removeRaw, writeJson } from '@/lib/storage'
import type { SavedReport } from '@/domain/reports/types'

export const REPORT_HISTORY_KEY = 'report-history'

/** Beyond this the list is trimmed oldest-first; history is a shortlist, not a log. */
export const MAX_HISTORY = 30

/**
 * Report history, kept apart from the commercial data.
 *
 * What is stored is the *configuration* plus a small snapshot of the headline
 * figures - never a rendered document. Re-opening an entry re-runs the engines
 * over live data, which is the honest behaviour: a report over a closed period
 * reproduces exactly, and one over the current period reflects where the period
 * actually stands now rather than a stale copy of this morning.
 *
 * Nothing here can write to an opportunity, a customer or a rep.
 */
export const localReportRepository = {
  load(): SavedReport[] {
    const stored = readJson<SavedReport[]>(REPORT_HISTORY_KEY)
    if (!Array.isArray(stored)) return []
    return stored.filter(
      (entry): entry is SavedReport =>
        Boolean(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.createdAt === 'string' &&
        Boolean(entry.config),
    )
  },

  save(reports: SavedReport[]): boolean {
    const trimmed = [...reports]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-MAX_HISTORY)
    return writeJson(REPORT_HISTORY_KEY, trimmed)
  },

  clear(): void {
    removeRaw(REPORT_HISTORY_KEY)
  },
}
