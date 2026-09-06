import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'accent' | 'positive' | 'warning' | 'negative' | 'outline'

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-ink-muted border-line',
  accent: 'bg-accent/12 text-accent border-accent/20',
  positive: 'bg-positive/12 text-positive border-positive/20',
  warning: 'bg-warning/12 text-warning border-warning/20',
  negative: 'bg-negative/12 text-negative border-negative/20',
  outline: 'bg-transparent text-ink-subtle border-line',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
