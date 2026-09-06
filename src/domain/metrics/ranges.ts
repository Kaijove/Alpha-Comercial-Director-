import { addDays, daysBetween, endOfDay, startOfDay, startOfYear } from '@/lib/dates'
import type { SalesGoals } from '@/domain/workspace'
import type { PeriodRange } from './periods'

/**
 * Analysis ranges.
 *
 * The dashboard asks "how is this month going", so it uses calendar periods.
 * Analytics asks "what has been happening lately", so it uses trailing windows
 * — plus year to date, which is deliberately identical to the dashboard's YTD
 * so the two screens can never disagree about the year.
 */
export type AnalyticsRangeKey = '7d' | '30d' | '90d' | 'ytd' | 'custom'

export const ANALYTICS_RANGES: { value: AnalyticsRangeKey; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
]

/** Average days per month, used to prorate the monthly commitment. */
const DAYS_PER_MONTH = 30.44

export interface AnalyticsPeriod extends PeriodRange {
  key: AnalyticsRangeKey
  label: string
  now: Date
  /** Days covered by the analysis window, inclusive. */
  days: number
  /** The same number of days immediately before `start`. */
  previous: PeriodRange
  /** Commitment attributable to this window. */
  target: number
  /** How much of it should already be booked. Equals `target` for a closed window. */
  expectedByNow: number
}

export interface CustomRange {
  start: string
  end: string
}

export function resolveAnalyticsPeriod(
  key: AnalyticsRangeKey,
  goals: SalesGoals,
  now: Date = new Date(),
  custom?: CustomRange,
): AnalyticsPeriod {
  const today = startOfDay(now)

  if (key === 'ytd') {
    const start = startOfYear(today)
    const end = endOfDay(today)
    const days = daysBetween(start, today) + 1
    const yearDays = daysBetween(start, startOfYear(today, 1)) || 365
    // The commitment for YTD is the annual target, exactly as on the dashboard.
    const target = goals.annualTarget > 0 ? goals.annualTarget : goals.monthlyTarget * 12

    return {
      key,
      label: 'Year to date',
      start,
      end,
      now,
      days,
      previous: {
        start: startOfYear(today, -1),
        end: endOfDay(addDays(startOfYear(today, -1), days - 1)),
      },
      target,
      expectedByNow: target * (days / yearDays),
    }
  }

  if (key === 'custom' && custom) {
    const parsedStart = startOfDay(new Date(custom.start))
    const parsedEndRaw = new Date(custom.end)
    const parsedEnd = endOfDay(parsedEndRaw > today ? today : parsedEndRaw)
    const start = parsedStart > parsedEnd ? startOfDay(parsedEnd) : parsedStart
    const days = Math.max(1, daysBetween(start, parsedEnd) + 1)
    const target = goals.monthlyTarget * (days / DAYS_PER_MONTH)

    return {
      key,
      label: 'Custom range',
      start,
      end: parsedEnd,
      now,
      days,
      previous: {
        start: addDays(start, -days),
        end: endOfDay(addDays(start, -1)),
      },
      target,
      expectedByNow: target,
    }
  }

  const days = key === '7d' ? 7 : key === '30d' ? 30 : 90
  const start = startOfDay(addDays(today, -(days - 1)))
  const end = endOfDay(today)
  const target = goals.monthlyTarget * (days / DAYS_PER_MONTH)

  return {
    key,
    label: `Last ${days} days`,
    start,
    end,
    now,
    days,
    previous: {
      start: addDays(start, -days),
      end: endOfDay(addDays(start, -1)),
    },
    // A trailing window has fully elapsed, so the whole commitment is due.
    target,
    expectedByNow: target,
  }
}

/** Pro-rata commitment per calendar day, used for chart reference lines. */
export function dailyTargetOf(goals: SalesGoals): number {
  return goals.monthlyTarget / DAYS_PER_MONTH
}
