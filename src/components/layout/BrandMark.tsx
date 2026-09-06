import { cn } from '@/lib/cn'

/**
 * The product mark: a command grid with a rising signal.
 * Geometric, single-accent, no gradient theatrics.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border border-line bg-elevated',
        className,
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
        <rect x="2" y="2" width="16" height="16" rx="4.5" stroke="currentColor" strokeOpacity="0.18" />
        <path
          d="M5.5 13.2L8.4 9.9l2.5 2.2 3.6-5"
          stroke="var(--color-accent)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14.5" cy="7.1" r="1.5" fill="var(--color-accent)" />
      </svg>
    </span>
  )
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      {compact ? null : (
        <span className="leading-tight">
          <span className="block text-body font-semibold tracking-tight text-ink">
            Commercial
          </span>
          <span className="block text-2xs font-medium tracking-[0.14em] text-ink-subtle">
            COMMAND CENTER
          </span>
        </span>
      )}
    </div>
  )
}
