import { isWon, type Opportunity } from '@/domain/commerce'
import { startOfMonth } from '@/lib/dates'

/**
 * Monthly revenue per rep, for the comparison chart.
 *
 * Emitted as one row per month with a column per selected rep, which is the
 * shape Recharts wants for a multi-series line chart.
 */
export interface RepTrendPoint {
  month: string
  label: string
  /** One entry per selected owner id, plus `target` when a pace is supplied. */
  [ownerId: string]: number | string
}

export function repRevenueTrend(
  opportunities: Opportunity[],
  ownerIds: string[],
  months: number,
  now: Date,
  locale: string,
  /** Monthly commitment per rep, for the pace line. Zero hides it. */
  monthlyTargetPerRep = 0,
): RepTrendPoint[] {
  const label = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(date)

  const won = opportunities.filter(
    (opportunity) => isWon(opportunity) && opportunity.closedAt !== null,
  )

  return Array.from({ length: months }, (_, index) => {
    const start = startOfMonth(now, -(months - 1 - index))
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)

    const point: RepTrendPoint = {
      month: start.toISOString(),
      label: label(start),
    }

    for (const ownerId of ownerIds) {
      point[ownerId] = won
        .filter((opportunity) => {
          if (opportunity.ownerId !== ownerId) return false
          const closed = new Date(opportunity.closedAt as string).getTime()
          return closed >= start.getTime() && closed <= end.getTime()
        })
        .reduce((total, opportunity) => total + opportunity.value, 0)
    }

    if (monthlyTargetPerRep > 0) point.target = monthlyTargetPerRep

    return point
  })
}

/** Muted, distinguishable line colours. Deliberately low chroma. */
export const REP_SERIES_COLORS = [
  '#5b8cff',
  '#3fbf8f',
  '#e0a458',
  '#b79bff',
  '#7ed6e0',
]
