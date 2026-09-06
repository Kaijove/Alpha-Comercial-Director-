import type { TooltipProps } from 'recharts'

export interface ChartTooltipProps extends TooltipProps<number, string> {
  /** Formats each value; receives the series dataKey so units can differ. */
  format?: (value: number, dataKey: string) => string
  /** Optional label override, e.g. a full date instead of the axis tick. */
  labelFormat?: (label: string) => string
}

/**
 * The one tooltip used by every chart: exact figures on demand, so the charts
 * themselves can stay free of value labels.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-field border border-line bg-elevated/95 px-3 py-2.5 shadow-pop backdrop-blur-sm">
      <p className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-subtle">
        {labelFormat ? labelFormat(String(label)) : String(label)}
      </p>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? undefined }}
              aria-hidden
            />
            <span className="text-ink-muted">{entry.name}</span>
            <span className="tnum ml-auto font-medium text-ink">
              {format
                ? format(Number(entry.value ?? 0), String(entry.dataKey))
                : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
