import { HEALTHY_COVERAGE } from '@/domain/health/commercialHealth'
import type { RepMetrics, TeamBenchmarks } from '@/domain/metrics/teamMetrics'

/**
 * Coaching signals.
 *
 * Deterministic rules that pair two facts about a rep into something a manager
 * can act on. Each rule states what was observed and what it suggests looking
 * at; none of them concludes that more activity is better, because that is not
 * a conclusion the data supports.
 */
export type CoachingTone = 'strength' | 'watch' | 'risk'

export interface CoachingSignal {
  id: string
  ownerId: string
  tone: CoachingTone
  title: string
  detail: string
  /** Ranking weight; higher surfaces first. */
  weight: number
}

export interface CoachingFormatters {
  currency: (value: number) => string
  percent: (ratio: number, decimals?: number) => string
  points: (ratio: number, decimals?: number) => string
  number: (value: number, decimals?: number) => string
}

/** A rep needs at least this many closed deals before a rate means anything. */
const MIN_CLOSED_FOR_RATE = 4

export function generateCoachingSignals(
  reps: RepMetrics[],
  benchmarks: TeamBenchmarks,
  fmt: CoachingFormatters,
): CoachingSignal[] {
  const signals: CoachingSignal[] = []
  const pp = (ratio: number) => `${fmt.number(Math.abs(ratio) * 100, 1)} pp`

  for (const rep of reps) {
    const closed = rep.wonCount + rep.lostCount
    const name = rep.owner.name

    // --- High activity, low conversion ------------------------------------
    if (
      benchmarks.winRate !== null &&
      rep.winRate !== null &&
      closed >= MIN_CLOSED_FOR_RATE &&
      rep.activity.total > benchmarks.activity * 1.15 &&
      rep.winRate < benchmarks.winRate - 0.05
    ) {
      signals.push({
        id: `coach-activity-conversion-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'watch',
        title: `${name}: high activity, low conversion`,
        detail: `${rep.activity.total} logged activities against a team average of ${fmt.number(benchmarks.activity, 0)}, but a win rate of ${fmt.percent(rep.winRate, 0)} versus ${fmt.percent(benchmarks.winRate, 0)} for the team. Worth looking at qualification rather than effort.`,
        weight: 78,
      })
    }

    // --- Strong pipeline, weak conversion ---------------------------------
    if (
      benchmarks.winRate !== null &&
      rep.winRate !== null &&
      closed >= MIN_CLOSED_FOR_RATE &&
      rep.pipeline > benchmarks.pipeline * 1.15 &&
      rep.winRate < benchmarks.winRate - 0.05
    ) {
      signals.push({
        id: `coach-pipeline-conversion-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'watch',
        title: `${name}: strong pipeline, low win rate`,
        detail: `${fmt.currency(rep.pipeline)} of open pipeline, ${pp(rep.pipeline / Math.max(benchmarks.pipeline, 1) - 1)} above the team average, converting at ${fmt.percent(rep.winRate, 0)}. Volume is not the constraint here.`,
        weight: 74,
      })
    }

    // --- Good conversion, not enough pipeline ------------------------------
    if (
      benchmarks.winRate !== null &&
      rep.winRate !== null &&
      closed >= MIN_CLOSED_FOR_RATE &&
      rep.winRate > benchmarks.winRate + 0.05 &&
      rep.coverage !== null &&
      rep.coverage < HEALTHY_COVERAGE
    ) {
      signals.push({
        id: `coach-pipeline-shortage-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'watch',
        title: `${name}: converts well but is short of pipeline`,
        detail: `A win rate of ${fmt.percent(rep.winRate, 0)}, ${pp(rep.winRate - benchmarks.winRate)} above the team, with coverage of only ${fmt.number(rep.coverage, 1)}x. More opportunities would convert at a better rate than the team average.`,
        weight: 72,
      })
    }

    // --- Coverage below the threshold --------------------------------------
    if (rep.coverage !== null && rep.coverage < 1.5 && rep.remaining > 0) {
      signals.push({
        id: `coach-coverage-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'risk',
        title: `${name}: pipeline coverage is below target`,
        detail: `${fmt.currency(rep.pipeline)} of open pipeline against ${fmt.currency(rep.remaining)} still to book, a coverage of ${fmt.number(rep.coverage, 1)}x. Healthy is around ${HEALTHY_COVERAGE}x.`,
        weight: 86,
      })
    }

    // --- Stalled opportunities ---------------------------------------------
    if (rep.stalledCount >= 3) {
      signals.push({
        id: `coach-stalled-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'risk',
        title: `${name}: ${rep.stalledCount} opportunities have gone quiet`,
        detail: `${rep.stalledCount} of their ${rep.openCount} open deals have had no activity for twelve days or more. Reviewing them is likely to move more revenue than new prospecting.`,
        weight: 80,
      })
    }

    // --- Growing faster than the team --------------------------------------
    if (
      rep.revenueDelta !== null &&
      rep.revenueDelta > 0.1 &&
      rep.revenue > benchmarks.revenue
    ) {
      signals.push({
        id: `coach-growth-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'strength',
        title: `${name}: revenue growing faster than the team average`,
        detail: `${fmt.currency(rep.revenue)} this period, up ${fmt.percent(rep.revenueDelta, 0)} on the previous one and above the team average of ${fmt.currency(benchmarks.revenue)}. Worth understanding what changed.`,
        weight: 64,
      })
    }

    // --- Concentration risk -------------------------------------------------
    if (rep.concentration !== null && rep.concentration >= 0.4 && rep.openCount >= 3) {
      signals.push({
        id: `coach-concentration-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'watch',
        title: `${name}: pipeline leans on one deal`,
        detail: `${fmt.percent(rep.concentration, 0)} of their open pipeline sits in a single opportunity. Their period turns on that one outcome.`,
        weight: 68,
      })
    }

    // --- Large deals, slow cycle -------------------------------------------
    if (
      benchmarks.averageDealSize !== null &&
      benchmarks.salesCycle !== null &&
      rep.averageDealSize !== null &&
      rep.salesCycle.average !== null &&
      rep.averageDealSize > benchmarks.averageDealSize * 1.2 &&
      rep.salesCycle.average > benchmarks.salesCycle * 1.25
    ) {
      signals.push({
        id: `coach-cycle-${rep.owner.id}`,
        ownerId: rep.owner.id,
        tone: 'watch',
        title: `${name}: larger deals, longer cycle`,
        detail: `An average deal of ${fmt.currency(rep.averageDealSize)} against ${fmt.currency(benchmarks.averageDealSize)} for the team, taking ${fmt.number(rep.salesCycle.average, 0)} days to close versus ${fmt.number(benchmarks.salesCycle, 0)}. Expected for bigger deals, but it changes how their forecast should be read.`,
        weight: 52,
      })
    }
  }

  return signals.sort((a, b) => b.weight - a.weight)
}

export interface AttentionReason {
  ownerId: string
  reasons: string[]
}

/**
 * Why a rep needs attention, in plain terms. Separate from the status score so
 * the UI can show the conclusion and the evidence side by side.
 */
export function attentionReasons(
  rep: RepMetrics,
  benchmarks: TeamBenchmarks,
  fmt: CoachingFormatters,
): string[] {
  const reasons: string[] = []

  if (rep.attainment !== null && rep.attainment < 0.8) {
    reasons.push(`Target attainment ${fmt.percent(rep.attainment, 0)}`)
  }
  if (rep.coverage !== null && rep.coverage < HEALTHY_COVERAGE) {
    reasons.push(`Pipeline coverage ${fmt.number(rep.coverage, 1)}x`)
  }
  if (
    rep.winRate !== null &&
    benchmarks.winRate !== null &&
    rep.winRate < benchmarks.winRate - 0.05
  ) {
    reasons.push(
      `Win rate ${fmt.percent(rep.winRate, 0)}, ${fmt.number(Math.abs(rep.winRate - benchmarks.winRate) * 100, 1)} pp below the team`,
    )
  }
  if (rep.revenueDelta !== null && rep.revenueDelta < -0.1) {
    reasons.push(`Revenue down ${fmt.percent(Math.abs(rep.revenueDelta), 0)} on the previous period`)
  }
  if (rep.stalledCount >= 3) {
    reasons.push(`${rep.stalledCount} stalled opportunities`)
  }

  return reasons
}
