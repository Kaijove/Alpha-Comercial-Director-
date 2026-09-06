import { isWon, type Opportunity } from '@/domain/commerce'
import { addDays, startOfDay, startOfMonth, startOfYear } from '@/lib/dates'

/**
 * Time series for the revenue chart.
 *
 * The chart range is a display choice, independent from the analytical period:
 * it only controls the shape of the curve, never the KPI figures.
 */
export type ChartRange = '7d' | '30d' | '90d' | 'ytd'

export const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
]

export interface RevenuePoint {
  /** Bucket start, ISO. Used as the chart key. */
  date: string
  label: string
  /** Revenue won inside this bucket. */
  revenue: number
  /** Running total since the start of the range. */
  cumulative: number
  /** Running total of the pro-rata commitment over the same span. */
  target: number
}

interface Bucket {
  start: Date
  end: Date
  label: string
}

function buildBuckets(range: ChartRange, now: Date, locale: string): Bucket[] {
  const today = startOfDay(now)
  const dayLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
  const monthLabel = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)

  if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30
    return Array.from({ length: days }, (_, index) => {
      const start = addDays(today, -(days - 1 - index))
      const end = new Date(start)
      end.setHours(23, 59, 59, 999)
      return { start, end, label: dayLabel(start) }
    })
  }

  if (range === '90d') {
    // 13 weekly buckets keep the 90-day curve readable.
    return Array.from({ length: 13 }, (_, index) => {
      const start = addDays(today, -(12 - index) * 7)
      const end = addDays(start, 6)
      end.setHours(23, 59, 59, 999)
      return { start, end, label: dayLabel(start) }
    })
  }

  const yearStart = startOfYear(today)
  const monthCount = today.getMonth() + 1
  return Array.from({ length: monthCount }, (_, index) => {
    const start = startOfMonth(yearStart, index)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end, label: monthLabel(start) }
  })
}

/**
 * @param dailyTarget pro-rata commitment per calendar day, used for the
 *        reference line. Derived from the monthly target so it always matches
 *        what the director configured.
 */
export function revenueSeries(
  opportunities: Opportunity[],
  range: ChartRange,
  now: Date,
  dailyTarget: number,
  locale: string,
): RevenuePoint[] {
  const buckets = buildBuckets(range, now, locale)
  const won = opportunities.filter(
    (opportunity) => isWon(opportunity) && opportunity.closedAt !== null,
  )

  let cumulative = 0
  let target = 0

  return buckets.map((bucket) => {
    const revenue = won
      .filter((opportunity) => {
        const closed = new Date(opportunity.closedAt as string).getTime()
        return closed >= bucket.start.getTime() && closed <= bucket.end.getTime()
      })
      .reduce((total, opportunity) => total + opportunity.value, 0)

    // end is 23:59:59.999 of the last day, so the raw difference already
    // rounds to the number of days the bucket covers.
    const spanDays = Math.round(
      (bucket.end.getTime() - bucket.start.getTime()) / 86_400_000,
    )

    cumulative += revenue
    target += dailyTarget * spanDays

    return {
      date: bucket.start.toISOString(),
      label: bucket.label,
      revenue,
      cumulative,
      target,
    }
  })
}
