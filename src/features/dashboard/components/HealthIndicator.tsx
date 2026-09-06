import type { CommercialHealth, HealthStatus } from '@/domain/health/commercialHealth'
import { cn } from '@/lib/cn'

const tones: Record<HealthStatus, { dot: string; text: string; ring: string }> = {
  healthy: { dot: 'bg-positive', text: 'text-positive', ring: 'bg-positive/15' },
  'on-track': { dot: 'bg-accent', text: 'text-accent', ring: 'bg-accent/15' },
  attention: { dot: 'bg-warning', text: 'text-warning', ring: 'bg-warning/15' },
  'at-risk': { dot: 'bg-negative', text: 'text-negative', ring: 'bg-negative/15' },
  critical: { dot: 'bg-negative', text: 'text-negative', ring: 'bg-negative/25' },
}

/**
 * Commercial Health, the one composite read on the business. The score and
 * sentence both come from `assessCommercialHealth`; nothing is decided here.
 */
export function HealthIndicator({
  health,
  className,
}: {
  health: CommercialHealth
  className?: string
}) {
  const tone = tones[health.status]

  return (
    <div
      className={cn(
        'rounded-panel border border-line bg-surface p-4 sm:min-w-[300px]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
          Commercial health
        </p>
        <span className="tnum text-2xs text-ink-faint">{health.score}/100</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <span className={cn('relative flex size-2.5 items-center justify-center')}>
          <span className={cn('absolute inset-0 rounded-full', tone.ring)} aria-hidden />
          <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden />
        </span>
        <span className={cn('text-title font-medium tracking-tight', tone.text)}>
          {health.label}
        </span>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">{health.summary}</p>

      <div className="mt-3.5 flex gap-1" aria-hidden>
        {health.signals.map((signal) => (
          <span
            key={signal.key}
            title={`${signal.label}: ${Math.round(signal.score)}/100`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-line"
          >
            <span
              className={cn(
                'block h-full rounded-full transition-[width] duration-700 ease-out-soft',
                signal.score >= 75
                  ? 'bg-positive/70'
                  : signal.score >= 55
                    ? 'bg-accent/70'
                    : signal.score >= 38
                      ? 'bg-warning/70'
                      : 'bg-negative/70',
              )}
              style={{ width: `${Math.max(6, Math.min(100, signal.score))}%` }}
            />
          </span>
        ))}
      </div>
    </div>
  )
}
