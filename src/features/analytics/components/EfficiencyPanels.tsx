import type { SalesCycleStats } from '@/domain/metrics/primitives'
import { DeltaBadge } from '@/components/composite/DeltaBadge'
import { Panel } from '@/components/ui/Panel'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-body">
      <span className="text-ink-muted">{label}</span>
      <span className="tnum font-medium text-ink">{value}</span>
    </div>
  )
}

function Title({ children }: { children: string }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  )
}

/**
 * Average and median days to close. Median is shown next to the mean because a
 * single very long deal can move the average a long way on a small sample.
 */
export function SalesCyclePanel({
  current,
  previous,
  deltaDays,
}: {
  current: SalesCycleStats
  previous: SalesCycleStats
  deltaDays: number | null
}) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <Title>Average sales cycle</Title>
        {/* A shorter cycle is better, so the arrow direction is inverted. */}
        <DeltaBadge
          value={deltaDays}
          higherIsBetter={false}
          threshold={1}
          label={
            deltaDays === null
              ? ''
              : `${deltaDays >= 0 ? '+' : ''}${fmt.number(deltaDays, 0)} days`
          }
        />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <p className="tnum text-metric font-semibold leading-none tracking-tight text-ink">
          {current.average !== null ? fmt.number(current.average, 0) : '—'}
        </p>
        <span className="text-body text-ink-muted">days</span>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row
          label="Median"
          value={current.median !== null ? `${fmt.number(current.median, 0)} days` : '—'}
        />
        <Row
          label="Previous period"
          value={
            previous.average !== null ? `${fmt.number(previous.average, 0)} days` : '—'
          }
        />
        <Row label="Based on" value={`${current.count} won deals`} />
      </div>

      {current.count === 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          No deals were won in this period, so the cycle cannot be measured yet.
        </p>
      ) : null}
    </Panel>
  )
}

/**
 * Average deal size. Takes plain values rather than the analytics snapshot so
 * it can be dropped into any other screen that has the same three numbers.
 */
export function AverageDealSizePanel({
  current,
  previous,
  wonCount,
  delta,
}: {
  current: number | null
  previous: number | null
  wonCount: number
  delta: number | null
}) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <Title>Average deal size</Title>
        <DeltaBadge
          value={delta}
          label={delta === null ? '' : `${delta >= 0 ? '+' : ''}${fmt.number(delta * 100, 1)}%`}
        />
      </div>

      <p
        className={cn(
          'mt-4 tnum text-metric font-semibold leading-none tracking-tight text-ink',
        )}
      >
        {current !== null ? fmt.currency(current) : '—'}
      </p>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row
          label="Previous period"
          value={previous !== null ? fmt.currency(previous) : '—'}
        />
        <Row
          label="Change"
          value={
            current !== null && previous !== null
              ? fmt.signed(current - previous)
              : '—'
          }
        />
        <Row label="Won deals" value={`${wonCount}`} />
      </div>
    </Panel>
  )
}
