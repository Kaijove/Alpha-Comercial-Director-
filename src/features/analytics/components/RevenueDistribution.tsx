import { useMemo, useState } from 'react'
import { PieChart } from 'lucide-react'
import type { Opportunity } from '@/domain/commerce'
import {
  DISTRIBUTION_DIMENSIONS,
  revenueDistribution,
  type DistributionContext,
  type DistributionDimension,
} from '@/domain/metrics/distribution'
import type { PeriodRange } from '@/domain/metrics/periods'
import { EmptyState } from '@/components/ui/EmptyState'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { controlBase, controlTone } from '@/components/ui/Field'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

/**
 * Where revenue came from, across any dimension the data actually carries.
 * A dimension is only offered because there is a real field behind it.
 */
export function RevenueDistribution({
  opportunities,
  context,
  range,
}: {
  opportunities: Opportunity[]
  context: DistributionContext
  range: PeriodRange
}) {
  const fmt = useFormatters()
  const [dimension, setDimension] = useState<DistributionDimension>('rep')

  const slices = useMemo(
    () => revenueDistribution(opportunities, dimension, context, range),
    [opportunities, dimension, context, range],
  )

  const top = slices[0]?.revenue ?? 0

  return (
    <Panel flush className="flex flex-col">
      <div className="p-5 pb-4 sm:p-6 sm:pb-4">
        <PanelHeader
          title="Revenue Distribution"
          description="Won revenue in the selected period, broken down by any dimension."
          action={
            <select
              aria-label="Break revenue down by"
              value={dimension}
              onChange={(event) =>
                setDimension(event.target.value as DistributionDimension)
              }
              className={cn(
                controlBase,
                controlTone(false),
                'h-8 w-[140px] appearance-none pr-7 text-xs',
              )}
            >
              {DISTRIBUTION_DIMENSIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-elevated text-ink"
                >
                  {option.label}
                </option>
              ))}
            </select>
          }
        />
      </div>

      {slices.length === 0 ? (
        <div className="px-5 pb-6 sm:px-6">
          <EmptyState
            className="border-0"
            icon={<PieChart className="size-4" />}
            title="No revenue to break down"
            description="No deals were won in this period, so there is nothing to distribute."
          />
        </div>
      ) : (
        <ul className="space-y-3 border-t border-line px-5 py-5 sm:px-6">
          {slices.slice(0, 8).map((slice) => (
            <li key={slice.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-ink-muted">{slice.label}</span>
                <span className="tnum shrink-0 text-ink-faint">
                  {fmt.percent(slice.share, 0)}
                  <span className="mx-1.5">·</span>
                  <span className="text-ink-subtle">{fmt.currency(slice.revenue)}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent/55 transition-[width] duration-700 ease-out-soft"
                  style={{ width: `${top > 0 ? (slice.revenue / top) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
