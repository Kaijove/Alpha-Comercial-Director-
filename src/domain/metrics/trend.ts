import { isWon, type Opportunity } from '@/domain/commerce'
import { addDays, endOfDay, startOfDay, startOfMonth } from '@/lib/dates'
import type { AnalyticsPeriod } from './ranges'

/**
 * Revenue trend for Analytics.
 *
 * Per-bucket rather than cumulative, because the question here is "what shape
 * is our revenue", and each bucket carries the equivalent bucket from the
 * previous period so the comparison is like for like.
 */
export type Granularity = 'daily' | 'weekly' | 'monthly'

export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

export interface TrendPoint {
  date: string
  label: string
  actual: number
  previous: number
  target: number
}

interface Bucket {
  start: Date
  end: Date
  label: string
  days: number
}

/** Granularities that make sense for a window of this many days. */
export function allowedGranularities(days: number): Granularity[] {
  if (days <= 31) return ['daily', 'weekly']
  if (days <= 120) return ['daily', 'weekly', 'monthly']
  return ['weekly', 'monthly']
}

function buildBuckets(
  period: AnalyticsPeriod,
  granularity: Granularity,
  locale: string,
): Bucket[] {
  const dayLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
  const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)

  const buckets: Bucket[] = []

  if (granularity === 'monthly') {
    let cursor = startOfMonth(period.start)
    while (cursor.getTime() <= period.end.getTime()) {
      const monthEnd = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      )
      const start = cursor.getTime() < period.start.getTime() ? period.start : cursor
      const end = monthEnd.getTime() > period.end.getTime() ? period.end : monthEnd
      buckets.push({
        start,
        end,
        label: monthLabel(cursor),
        days: Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000)),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
    return buckets
  }

  const step = granularity === 'weekly' ? 7 : 1
  let cursor = startOfDay(period.start)
  while (cursor.getTime() <= period.end.getTime()) {
    const rawEnd = endOfDay(addDays(cursor, step - 1))
    const end = rawEnd.getTime() > period.end.getTime() ? period.end : rawEnd
    buckets.push({
      start: cursor,
      end,
      label: dayLabel(cursor),
      days: Math.max(1, Math.round((end.getTime() - cursor.getTime()) / 86_400_000) || 1),
    })
    cursor = addDays(cursor, step)
  }
  return buckets
}

export function revenueTrend(
  opportunities: Opportunity[],
  period: AnalyticsPeriod,
  granularity: Granularity,
  dailyTarget: number,
  locale: string,
): TrendPoint[] {
  const buckets = buildBuckets(period, granularity, locale)
  const won = opportunities.filter(
    (opportunity) => isWon(opportunity) && opportunity.closedAt !== null,
  )

  // Shifting each bucket back by the window length gives the comparable bucket
  // in the previous period.
  const shiftMs = period.start.getTime() - period.previous.start.getTime()

  const revenueBetween = (from: number, to: number) =>
    won
      .filter((opportunity) => {
        const closed = new Date(opportunity.closedAt as string).getTime()
        return closed >= from && closed <= to
      })
      .reduce((total, opportunity) => total + opportunity.value, 0)

  return buckets.map((bucket) => ({
    date: bucket.start.toISOString(),
    label: bucket.label,
    actual: revenueBetween(bucket.start.getTime(), bucket.end.getTime()),
    previous: revenueBetween(
      bucket.start.getTime() - shiftMs,
      bucket.end.getTime() - shiftMs,
    ),
    target: dailyTarget * bucket.days,
  }))
}
