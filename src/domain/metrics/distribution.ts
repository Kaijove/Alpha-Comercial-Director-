import { isWon, type Customer, type Opportunity, type Owner } from '@/domain/commerce'
import { isWithin } from '@/lib/dates'
import { sum } from './primitives'
import type { PeriodRange } from './periods'

/**
 * Where revenue comes from.
 *
 * Every dimension here is backed by a real field on the data model - no
 * dimension is offered that would render an empty breakdown.
 */
export type DistributionDimension =
  | 'rep'
  | 'customer'
  | 'product'
  | 'region'
  | 'industry'

export const DISTRIBUTION_DIMENSIONS: {
  value: DistributionDimension
  label: string
}[] = [
  { value: 'rep', label: 'Sales rep' },
  { value: 'customer', label: 'Customer' },
  { value: 'product', label: 'Product' },
  { value: 'region', label: 'Region' },
  { value: 'industry', label: 'Industry' },
]

export interface DistributionSlice {
  key: string
  label: string
  revenue: number
  deals: number
  /** Share of the total, 0..1. */
  share: number
}

export interface DistributionContext {
  owners: Owner[]
  customers: Customer[]
}

export function revenueDistribution(
  opportunities: Opportunity[],
  dimension: DistributionDimension,
  context: DistributionContext,
  range: PeriodRange,
): DistributionSlice[] {
  const ownerName = new Map(context.owners.map((owner) => [owner.id, owner.name]))
  const customer = new Map(context.customers.map((entry) => [entry.id, entry]))

  const keyOf = (opportunity: Opportunity): { key: string; label: string } => {
    switch (dimension) {
      case 'rep':
        return {
          key: opportunity.ownerId,
          label: ownerName.get(opportunity.ownerId) ?? 'Unassigned',
        }
      case 'customer':
        return {
          key: opportunity.customerId,
          label: customer.get(opportunity.customerId)?.name ?? 'Unknown account',
        }
      case 'product':
        return { key: opportunity.product, label: opportunity.product }
      case 'region':
        return { key: opportunity.region, label: opportunity.region }
      case 'industry': {
        const industry = customer.get(opportunity.customerId)?.industry ?? 'Other'
        return { key: industry, label: industry }
      }
    }
  }

  const won = opportunities.filter(
    (opportunity) =>
      isWon(opportunity) && isWithin(opportunity.closedAt, range.start, range.end),
  )

  const buckets = new Map<string, DistributionSlice>()
  for (const opportunity of won) {
    const { key, label } = keyOf(opportunity)
    const existing = buckets.get(key)
    if (existing) {
      existing.revenue += opportunity.value
      existing.deals += 1
    } else {
      buckets.set(key, { key, label, revenue: opportunity.value, deals: 1, share: 0 })
    }
  }

  const total = sum([...buckets.values()].map((slice) => slice.revenue))
  return [...buckets.values()]
    .map((slice) => ({ ...slice, share: total > 0 ? slice.revenue / total : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
}
