import { isOpen, isWon, type Customer, type Opportunity } from '@/domain/commerce'
import { sum } from './primitives'
import type { PeriodRange } from './periods'
import { isWithin } from '@/lib/dates'

export interface CustomerStat {
  customer: Customer
  /** Won revenue inside the range. */
  revenue: number
  wonDeals: number
  averageDealSize: number | null
  openPipeline: number
  lastActivityAt: string | null
}

/**
 * Revenue concentration by account. Uses exactly the same revenue definition as
 * every other screen: the value of deals won inside the range.
 */
export function customerStats(
  opportunities: Opportunity[],
  customers: Customer[],
  range: PeriodRange,
): CustomerStat[] {
  const byCustomer = new Map<string, Opportunity[]>()
  for (const opportunity of opportunities) {
    const bucket = byCustomer.get(opportunity.customerId)
    if (bucket) bucket.push(opportunity)
    else byCustomer.set(opportunity.customerId, [opportunity])
  }

  return customers
    .map((customer) => {
      const owned = byCustomer.get(customer.id) ?? []
      const won = owned.filter(
        (opportunity) =>
          isWon(opportunity) && isWithin(opportunity.closedAt, range.start, range.end),
      )
      const revenue = sum(won.map((opportunity) => opportunity.value))
      const lastActivityAt = owned.reduce<string | null>((latest, opportunity) => {
        if (!latest) return opportunity.lastActivityAt
        return new Date(opportunity.lastActivityAt) > new Date(latest)
          ? opportunity.lastActivityAt
          : latest
      }, null)

      return {
        customer,
        revenue,
        wonDeals: won.length,
        averageDealSize: won.length > 0 ? revenue / won.length : null,
        openPipeline: sum(owned.filter(isOpen).map((opportunity) => opportunity.value)),
        lastActivityAt,
      }
    })
    .filter((stat) => stat.revenue > 0 || stat.openPipeline > 0)
}

/** Share of revenue held by the top `count` accounts. Null when there is none. */
export function revenueConcentration(
  stats: CustomerStat[],
  count = 3,
): { share: number; names: string[] } | null {
  const withRevenue = [...stats]
    .filter((stat) => stat.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)

  const total = sum(withRevenue.map((stat) => stat.revenue))
  if (total <= 0 || withRevenue.length === 0) return null

  const top = withRevenue.slice(0, count)
  return {
    share: sum(top.map((stat) => stat.revenue)) / total,
    names: top.map((stat) => stat.customer.name),
  }
}
