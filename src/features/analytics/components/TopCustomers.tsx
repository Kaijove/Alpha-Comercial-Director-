import { Building2 } from 'lucide-react'
import type { CustomerStat } from '@/domain/metrics/customers'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { SortHeader } from '@/components/composite/SortHeader'
import { daysSince } from '@/domain/commerce'
import { useFormatters } from '@/hooks/useFormatters'
import { useSortable } from '@/hooks/useSortable'

type Column = 'name' | 'revenue' | 'deals' | 'dealSize' | 'activity'

export function TopCustomers({
  customers,
  now,
  limit = 8,
}: {
  customers: CustomerStat[]
  now: Date
  limit?: number
}) {
  const fmt = useFormatters()

  const withRevenue = customers.filter((stat) => stat.revenue > 0)

  const { sorted, sort, toggle } = useSortable<CustomerStat, Column>(
    withRevenue,
    {
      name: (stat) => stat.customer.name,
      revenue: (stat) => stat.revenue,
      deals: (stat) => stat.wonDeals,
      dealSize: (stat) => stat.averageDealSize,
      activity: (stat) =>
        stat.lastActivityAt ? new Date(stat.lastActivityAt).getTime() : null,
    },
    { key: 'revenue', direction: 'desc' },
  )

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Top Customers"
          description="Accounts that generated revenue in the selected period."
        />
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<Building2 className="size-4" />}
            title="No customer revenue in this period"
            description="No deals were won, so there is nothing to rank by account yet."
          />
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[520px] border-collapse text-body">
            <thead>
              <tr className="border-b border-line">
                <SortHeader
                  label="Account"
                  columnKey="name"
                  align="left"
                  active={sort.key === 'name'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-5 py-2.5 sm:px-6"
                />
                <SortHeader
                  label="Revenue"
                  columnKey="revenue"
                  active={sort.key === 'revenue'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Deals"
                  columnKey="deals"
                  active={sort.key === 'deals'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Avg. deal"
                  columnKey="dealSize"
                  active={sort.key === 'dealSize'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-3 py-2.5"
                />
                <SortHeader
                  label="Last activity"
                  columnKey="activity"
                  active={sort.key === 'activity'}
                  direction={sort.direction}
                  onSort={toggle}
                  className="px-5 py-2.5 sm:px-6"
                />
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, limit).map((stat) => {
                const inactive = stat.lastActivityAt
                  ? daysSince(stat.lastActivityAt, now)
                  : null

                return (
                  <tr
                    key={stat.customer.id}
                    className="border-b border-line-soft transition-colors duration-150 last:border-0 hover:bg-elevated"
                  >
                    <td className="px-5 py-3 sm:px-6">
                      <span className="block truncate text-ink">{stat.customer.name}</span>
                      <span className="block truncate text-2xs text-ink-faint">
                        {stat.customer.industry} · {stat.customer.region}
                      </span>
                    </td>
                    <td className="tnum px-3 py-3 text-right font-medium text-ink">
                      {fmt.currency(stat.revenue)}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {stat.wonDeals}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-ink-muted">
                      {stat.averageDealSize !== null
                        ? fmt.currency(stat.averageDealSize)
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted sm:px-6">
                      {inactive === null
                        ? 'No activity recorded'
                        : inactive === 0
                          ? 'Today'
                          : `${inactive}d ago`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
