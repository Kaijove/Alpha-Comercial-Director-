import {
  AlertTriangle,
  Activity as ActivityIcon,
  ArrowUpRight,
  Building2,
  Compass,
  Coins,
  LineChart,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  SEVERITY_LABELS,
  type InsightCategory,
  type InsightSeverity,
  type InsightStatus,
} from '@/domain/intelligence/types'
import { cn } from '@/lib/cn'

/**
 * The shared visual language for insights.
 *
 * Colour is only ever used to say how serious something is - never to decorate.
 * There is one icon per category and one tone per severity, so a director learns
 * the vocabulary once and it holds across every screen.
 */
export const severityTone: Record<
  InsightSeverity,
  { text: string; dot: string; ring: string; border: string }
> = {
  critical: {
    text: 'text-negative',
    dot: 'bg-negative',
    ring: 'bg-negative/12',
    border: 'border-negative/30',
  },
  high: {
    text: 'text-warning',
    dot: 'bg-warning',
    ring: 'bg-warning/12',
    border: 'border-warning/25',
  },
  medium: {
    text: 'text-accent',
    dot: 'bg-accent',
    ring: 'bg-accent/12',
    border: 'border-line',
  },
  low: {
    text: 'text-ink-muted',
    dot: 'bg-ink-faint',
    ring: 'bg-raised',
    border: 'border-line',
  },
  positive: {
    text: 'text-positive',
    dot: 'bg-positive',
    ring: 'bg-positive/12',
    border: 'border-positive/25',
  },
}

export const categoryIcon: Record<InsightCategory, LucideIcon> = {
  revenue: Coins,
  pipeline: Compass,
  opportunity: Zap,
  forecast: LineChart,
  team: Users,
  activity: ActivityIcon,
  customer: Building2,
  performance: ArrowUpRight,
  anomaly: AlertTriangle,
}

export function SeverityBadge({
  severity,
  className,
}: {
  severity: InsightSeverity
  className?: string
}) {
  const tone = severityTone[severity]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-2xs font-medium tracking-wide',
        tone.ring,
        tone.text,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden />
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

export const statusTone: Record<InsightStatus, string> = {
  new: 'text-accent',
  seen: 'text-ink-subtle',
  resolved: 'text-positive',
  dismissed: 'text-ink-faint',
}
