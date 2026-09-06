import { generateCoachingSignals, type CoachingSignal } from '@/domain/team/coachingEngine'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type { IntelligenceContext } from './context'
import type { InsightDraft } from './types'

/**
 * Team intelligence.
 *
 * Rather than writing a second set of team rules, this adapts the coaching
 * engine the Team page already uses. One rule set, two presentations - which is
 * also why a signal shown here and a signal shown there can never disagree.
 */
function fromCoaching(
  signal: CoachingSignal,
  context: IntelligenceContext,
): InsightDraft {
  const rep = context.reps.find((entry) => entry.owner.id === signal.ownerId)
  const { fmt } = context

  const evidence = rep
    ? [
        { label: 'Revenue', value: fmt.currency(rep.revenue) },
        {
          label: 'Attainment',
          value: rep.attainment !== null ? fmt.percent(rep.attainment, 0) : '—',
        },
        {
          label: 'Win rate',
          value: rep.winRate !== null ? fmt.percent(rep.winRate, 0) : '—',
        },
        { label: 'Open pipeline', value: fmt.currency(rep.pipeline) },
        {
          label: 'Coverage',
          value: rep.coverage !== null ? `${fmt.number(rep.coverage, 1)}x` : 'Covered',
        },
        { label: 'Activities', value: `${rep.activity.total}` },
      ]
    : []

  // A coaching signal about missing revenue carries the shortfall as impact,
  // so the priority engine can weigh it against a deal-level risk.
  const impact =
    rep && signal.tone !== 'strength' && rep.remaining > 0 ? rep.remaining : null

  return {
    id: `team.${signal.id}`,
    type: signal.tone === 'strength' ? 'opportunity' : 'performance',
    category: 'team',
    title: signal.title,
    description: signal.detail,
    entityType: 'rep',
    entityId: signal.ownerId,
    entityName: rep?.owner.name ?? null,
    impact,
    reason:
      signal.tone === 'strength'
        ? 'Understanding what is working here is usually cheaper than fixing what is not.'
        : signal.tone === 'risk'
          ? 'Left alone, this shows up in the number before it shows up in a conversation.'
          : 'Two figures that disagree usually mean the constraint is not where it looks.',
    triggers: buildTriggers(signal, context),
    evidence,
    recommendation:
      signal.tone === 'strength'
        ? 'Understand what is working and see whether it transfers.'
        : 'Take this into the next one-to-one with the figures in front of you.',
    action: { label: 'View team performance', to: '/team' },
    createdAt: context.metrics.period.start.toISOString(),
    confidence: signal.tone === 'risk' ? 0.85 : 0.7,
    daysUntil: context.metrics.period.remainingDays,
    positive: signal.tone === 'strength',
  }
}

function buildTriggers(
  signal: CoachingSignal,
  context: IntelligenceContext,
): string[] {
  const rep = context.reps.find((entry) => entry.owner.id === signal.ownerId)
  if (!rep) return [signal.detail]
  const { fmt, benchmarks } = context

  const triggers: string[] = []
  if (rep.winRate !== null && benchmarks.winRate !== null) {
    triggers.push(
      `Win rate ${fmt.percent(rep.winRate, 0)} against a team average of ${fmt.percent(benchmarks.winRate, 0)}`,
    )
  }
  if (rep.coverage !== null) {
    triggers.push(
      `Pipeline coverage ${fmt.number(rep.coverage, 1)}x against a ${T.healthyCoverage}x threshold`,
    )
  }
  if (rep.stalledCount > 0) {
    triggers.push(`${rep.stalledCount} of their open deals have gone quiet`)
  }
  triggers.push(
    `${rep.wonCount + rep.lostCount} closed deals this period, ${T.minClosedForRate} needed before a rate is treated as meaningful`,
  )
  return triggers
}

export function teamRules(context: IntelligenceContext): InsightDraft[] {
  const drafts = generateCoachingSignals(context.reps, context.benchmarks, context.fmt)
    // Stalled deals already have a company-level signal that ranks every quiet
    // deal across the business. Repeating it once per rep would fill the page
    // with four descriptions of one problem, which is exactly what an
    // intelligence system is supposed to prevent. The per-rep version stays on
    // the Team page, where per-rep context is the point.
    .filter((signal) => !signal.id.startsWith('coach-stalled-'))
    .map((signal) => fromCoaching(signal, context))

  // --- Revenue leaning on one representative ------------------------------
  const { fmt, metrics, reps } = context
  if (metrics.revenue > 0 && reps.length > 2) {
    const top = [...reps].sort((a, b) => b.revenue - a.revenue)[0]
    const share = top.revenue / metrics.revenue

    if (share >= T.repConcentration) {
      drafts.push({
        id: `risk.rep-concentration:${top.owner.id}`,
        type: 'risk',
        category: 'team',
        title: `${fmt.percent(share, 0)} of revenue came from ${top.owner.name}`,
        description: `${fmt.currency(top.revenue)} of ${fmt.currency(metrics.revenue)} booked this period, across a team of ${reps.length}.`,
        entityType: 'rep',
        entityId: top.owner.id,
        entityName: top.owner.name,
        impact: top.revenue,
        reason:
          'A period this dependent on one person is exposed to their calendar, not just their performance.',
        triggers: [
          `${top.owner.name} holds ${fmt.percent(share, 0)} of period revenue`,
          `Above the ${fmt.percent(T.repConcentration, 0)} concentration threshold`,
          `${reps.length} reps on the roster`,
        ],
        evidence: reps
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 4)
          .map((rep) => ({
            label: rep.owner.name,
            value: fmt.currency(rep.revenue),
          })),
        recommendation:
          'Look at why the rest of the team is not converting at the same rate.',
        action: { label: 'View team performance', to: '/team' },
        createdAt: metrics.period.start.toISOString(),
        confidence: 0.8,
        daysUntil: null,
      })
    }
  }

  return drafts
}
