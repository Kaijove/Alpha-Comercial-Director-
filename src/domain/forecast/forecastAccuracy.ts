import { toDateKey } from '@/lib/dates'
import type { ForecastAccuracy, ForecastSnapshot } from './types'

/**
 * Forecast accuracy, when there is anything to be accurate about.
 *
 * A snapshot can only be scored once its period has actually finished and the
 * real number is known. Until then there is no accuracy to report - and
 * reporting one anyway, from a forecast compared against a period still in
 * progress, would be worse than reporting nothing.
 */
export function assessAccuracy(snapshots: ForecastSnapshot[]): ForecastAccuracy {
  const closed = snapshots.filter(
    (snapshot) => snapshot.actualValue !== null && snapshot.actualValue !== undefined,
  )

  if (closed.length === 0) {
    return {
      available: false,
      scored: [],
      bias: null,
      message:
        snapshots.length === 0
          ? 'Forecast accuracy will become available once forecast snapshots have been saved and their periods have closed.'
          : `${snapshots.length} ${snapshots.length === 1 ? 'snapshot has' : 'snapshots have'} been saved, but no period has closed yet. Accuracy will appear once one has.`,
    }
  }

  const scored = closed.map((snapshot) => {
    const actual = snapshot.actualValue as number
    const variance = snapshot.forecastValue - actual
    // Accuracy is the share of the actual number the forecast got right; a
    // forecast that overshoots by 20% is exactly as wrong as one that
    // undershoots by 20%.
    const accuracy =
      actual > 0 ? Math.max(0, 100 - (Math.abs(variance) / actual) * 100) : 0
    return { snapshot, variance, accuracy }
  })

  const bias = scored.reduce((total, entry) => total + entry.variance, 0) / scored.length

  return {
    available: true,
    scored: scored.sort((a, b) => b.snapshot.createdAt.localeCompare(a.snapshot.createdAt)),
    bias,
    message:
      bias > 0
        ? 'On the periods scored so far, the forecast has run high.'
        : bias < 0
          ? 'On the periods scored so far, the forecast has run low.'
          : 'On the periods scored so far, the forecast has been unbiased.',
  }
}

/** Stable id so the same forecast, taken twice in a day, is one snapshot. */
export function snapshotId(period: string, createdAt: string): string {
  return `${period}:${toDateKey(new Date(createdAt))}`
}
