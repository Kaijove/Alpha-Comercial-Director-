import { isWon, type Opportunity } from '@/domain/commerce'

/**
 * The revenue line: what actually happened, then where the period is going.
 *
 * Historical points are real won deals and nothing else - no synthetic history
 * is generated to make the chart look fuller. If a business has three months of
 * data, the chart shows three months.
 *
 * The projection is drawn as its own series starting at the last completed
 * bucket, so the boundary between "this happened" and "this is a projection" is
 * a visible break rather than a legend note.
 */
export type ForecastGranularity = 'month' | 'quarter' | 'year'

export const GRANULARITY_OPTIONS: { value: ForecastGranularity; label: string }[] = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
]

export interface ForecastPoint {
  key: string
  label: string
  /** Revenue actually won in this bucket. Null for the future. */
  actual: number | null
  /** Projection. Only the current bucket and the anchor before it. */
  forecast: number | null
  /** Best and worst case, on the current bucket only. */
  best: number | null
  worst: number | null
  target: number | null
  isCurrent: boolean
}

interface Bucket {
  key: string
  label: string
  start: Date
  end: Date
}

function bucketsFor(
  granularity: ForecastGranularity,
  now: Date,
  count: number,
  locale: string,
): Bucket[] {
  const buckets: Bucket[] = []

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    if (granularity === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999)
      buckets.push({
        key: `${start.getFullYear()}-${start.getMonth()}`,
        label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(start),
        start,
        end,
      })
    } else if (granularity === 'quarter') {
      const quarter = Math.floor(now.getMonth() / 3) - offset
      const year = now.getFullYear() + Math.floor(quarter / 4)
      const index = ((quarter % 4) + 4) % 4
      const start = new Date(year, index * 3, 1)
      const end = new Date(year, index * 3 + 3, 0, 23, 59, 59, 999)
      buckets.push({ key: `${year}-Q${index + 1}`, label: `Q${index + 1} ${year}`, start, end })
    } else {
      const year = now.getFullYear() - offset
      buckets.push({
        key: `${year}`,
        label: `${year}`,
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      })
    }
  }

  return buckets
}

/** How many buckets to draw at each granularity. */
const BUCKET_COUNT: Record<ForecastGranularity, number> = {
  month: 8,
  quarter: 6,
  year: 4,
}

export interface SeriesInput {
  opportunities: Opportunity[]
  granularity: ForecastGranularity
  now: Date
  locale: string
  /** Base, best and worst forecasts for the current period. */
  forecast: number
  best: number
  worst: number
  /** Target for one bucket at this granularity, null when unknown. */
  bucketTarget: number | null
}

export function buildForecastSeries(input: SeriesInput): ForecastPoint[] {
  const { opportunities, granularity, now, locale } = input
  const buckets = bucketsFor(granularity, now, BUCKET_COUNT[granularity], locale)

  const won = opportunities.filter((o) => isWon(o) && o.closedAt !== null)

  const points: ForecastPoint[] = buckets.map((bucket, index) => {
    const isCurrent = index === buckets.length - 1
    const actual = won
      .filter((o) => {
        const closed = new Date(o.closedAt as string)
        return closed >= bucket.start && closed <= bucket.end
      })
      .reduce((total, o) => total + o.value, 0)

    return {
      key: bucket.key,
      label: bucket.label,
      actual,
      // Anchor the projection on the last completed bucket so the dashed line
      // starts where the solid one ends instead of floating.
      forecast: isCurrent ? input.forecast : index === buckets.length - 2 ? actual : null,
      best: isCurrent ? input.best : index === buckets.length - 2 ? actual : null,
      worst: isCurrent ? input.worst : index === buckets.length - 2 ? actual : null,
      target: input.bucketTarget,
      isCurrent,
    }
  })

  // Drop leading buckets with no history at all rather than drawing a flat zero
  // line that implies the business existed and sold nothing.
  const firstWithData = points.findIndex((point) => (point.actual ?? 0) > 0)
  return firstWithData <= 0 ? points : points.slice(firstWithData)
}
