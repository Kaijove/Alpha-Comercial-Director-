import { readJson, removeRaw, writeJson } from '@/lib/storage'
import type { ForecastSnapshot } from '@/domain/forecast/types'

export const FORECAST_SNAPSHOT_KEY = 'forecast-snapshots'

/** Beyond this the list is trimmed oldest-first; a period needs a handful, not a log. */
export const MAX_SNAPSHOTS = 60

/**
 * Saved forecasts, kept apart from the commercial data.
 *
 * A snapshot is a record of what the model said at a moment in time. It exists
 * so that "what did we predict two weeks ago against what we predict now"
 * becomes answerable - which is the only honest route to forecast accuracy.
 *
 * Nothing fabricates one. If no snapshots exist, accuracy stays unavailable and
 * the UI says so rather than inventing a variance.
 */
export const localForecastSnapshotRepository = {
  load(): ForecastSnapshot[] {
    const stored = readJson<ForecastSnapshot[]>(FORECAST_SNAPSHOT_KEY)
    if (!Array.isArray(stored)) return []
    return stored.filter(
      (entry): entry is ForecastSnapshot =>
        Boolean(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.forecastValue === 'number',
    )
  },

  save(snapshots: ForecastSnapshot[]): boolean {
    const trimmed = [...snapshots]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-MAX_SNAPSHOTS)
    return writeJson(FORECAST_SNAPSHOT_KEY, trimmed)
  },

  clear(): void {
    removeRaw(FORECAST_SNAPSHOT_KEY)
  },
}
