import { daysUntil } from '@/domain/commerce'
import type { Period } from '@/domain/metrics/periods'
import { FORECAST_CONFIG as C } from './forecastConfig'
import type { ForecastContribution, ForecastTimeline, TimelineBucket } from './types'

/**
 * When the forecast is expected to arrive.
 *
 * The same total lands very differently depending on its shape: revenue spread
 * across a month is a plan, and revenue stacked into the last ten days is a
 * hope with an execution risk attached. This exists to make that difference
 * visible before the period ends rather than after.
 */
export function buildTimeline(
  contributions: ForecastContribution[],
  period: Period,
  now: Date,
): ForecastTimeline {
  const total = contributions.reduce((sum, entry) => sum + entry.contribution, 0)
  const daysToPeriodEnd = daysUntil(period.end.toISOString(), now)

  const definitions: { key: string; label: string; test: (days: number) => boolean }[] = [
    { key: 'overdue', label: 'Overdue', test: (days) => days < 0 },
    { key: 'this-week', label: 'This week', test: (days) => days >= 0 && days <= 7 },
    { key: 'next-week', label: 'Next week', test: (days) => days > 7 && days <= 14 },
    {
      key: 'rest-of-period',
      label: 'Rest of the period',
      test: (days) => days > 14 && days <= daysToPeriodEnd,
    },
  ]

  const buckets: TimelineBucket[] = definitions.map((definition) => {
    const matching = contributions.filter((entry) =>
      definition.test(daysUntil(entry.opportunity.expectedCloseDate, now)),
    )
    const value = matching.reduce((sum, entry) => sum + entry.contribution, 0)
    return {
      key: definition.key,
      label: definition.label,
      value,
      dealCount: matching.length,
      share: total > 0 ? value / total : 0,
    }
  })

  // Late concentration is measured against the period end, not against today,
  // so the warning does not appear simply because the period is nearly over.
  const lateWindowStart = Math.max(0, daysToPeriodEnd - C.lateConcentrationDays)
  const lateValue = contributions
    .filter((entry) => {
      const days = daysUntil(entry.opportunity.expectedCloseDate, now)
      return days >= lateWindowStart && days <= daysToPeriodEnd
    })
    .reduce((sum, entry) => sum + entry.contribution, 0)

  const lateShare = total > 0 ? lateValue / total : 0
  const backLoaded =
    lateShare >= C.lateConcentrationThreshold && daysToPeriodEnd > C.lateConcentrationDays

  return {
    buckets: buckets.filter((bucket) => bucket.dealCount > 0 || bucket.key !== 'overdue'),
    lateShare,
    lateDays: C.lateConcentrationDays,
    backLoaded,
    summary:
      total === 0
        ? 'No open deals are expected to close inside this period.'
        : backLoaded
          ? `${Math.round(lateShare * 100)}% of forecast revenue is expected in the final ${C.lateConcentrationDays} days of the period, which leaves no room to recover a slip.`
          : `${Math.round(lateShare * 100)}% of forecast revenue is expected in the final ${C.lateConcentrationDays} days, which is a workable spread.`,
  }
}
