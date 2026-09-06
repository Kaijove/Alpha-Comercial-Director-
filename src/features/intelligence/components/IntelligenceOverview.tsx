import {
  AlertOctagon,
  AlertTriangle,
  Coins,
  Inbox,
  Sparkle,
  Zap,
} from 'lucide-react'
import type { IntelligenceOverview as OverviewStats } from '@/domain/intelligence/intelligenceEngine'
import { AnimatedNumber } from '@/components/composite/AnimatedNumber'
import { KpiCard } from '@/components/composite/KpiCard'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * The executive read on the intelligence itself: how much needs attention, how
 * much money is exposed, and how much of it is still unaddressed. Every figure
 * comes from the engine - none of it is written into the component.
 */
export function IntelligenceOverviewStrip({ overview }: { overview: OverviewStats }) {
  const fmt = useFormatters()
  const count = (value: number) => fmt.number(value, 0)

  return (
    <section
      aria-label="Intelligence overview"
      // Six across only when there is genuinely room for the labels; below that
      // three, so a heading like "Deals needing attention" is never truncated.
      className="grid grid-cols-1 gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
    >
      <KpiCard
        label="Critical issues"
        icon={AlertOctagon}
        value={<AnimatedNumber value={overview.criticalCount} format={count} />}
        context={
          overview.criticalCount === 0
            ? 'Nothing at the top severity'
            : 'Could materially affect revenue'
        }
      />
      <KpiCard
        label="High priority"
        icon={AlertTriangle}
        value={<AnimatedNumber value={overview.highCount} format={count} />}
        context="Worth acting on this week"
      />
      <KpiCard
        label="Revenue at risk"
        icon={Coins}
        value={
          <AnimatedNumber
            value={overview.revenueAtRisk}
            format={fmt.currency}
            title={`Exactly ${fmt.exact(overview.revenueAtRisk)}, counted once per deal`}
          />
        }
        context="Weighted, each deal counted once"
      />
      <KpiCard
        label="Deals needing attention"
        icon={Zap}
        value={
          <AnimatedNumber
            value={overview.opportunitiesNeedingAttention}
            format={count}
          />
        }
        context="Health score below the healthy band"
      />
      <KpiCard
        label="Positive signals"
        icon={Sparkle}
        value={<AnimatedNumber value={overview.positiveCount} format={count} />}
        context="Worth protecting or repeating"
      />
      <KpiCard
        label="Unresolved insights"
        icon={Inbox}
        value={<AnimatedNumber value={overview.unresolvedCount} format={count} />}
        context="Not yet resolved or dismissed"
      />
    </section>
  )
}
