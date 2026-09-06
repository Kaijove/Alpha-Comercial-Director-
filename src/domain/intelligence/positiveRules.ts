import { STAGE_LABELS } from '@/domain/commerce'
import { weightedValue } from '@/domain/metrics/primitives'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type { IntelligenceContext } from './context'
import type { InsightDraft } from './types'

/**
 * Positive intelligence.
 *
 * An intelligence page that only ever reports problems teaches a director to
 * dread opening it, and it hides the thing worth protecting. These rules use
 * exactly the same data and the same thresholds as the risk rules - they are
 * simply the conditions worth knowing about for the opposite reason.
 */

/** A deal that has moved forward recently and still looks strong. */
export function momentumRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt } = context

  const moving = context.scored
    .filter(
      (entry) =>
        entry.health.recentProgressions >= 2 &&
        entry.health.band === 'healthy' &&
        entry.opportunity.probability >= 0.6,
    )
    .sort((a, b) => b.score - a.score)

  if (moving.length === 0) return []
  const best = moving[0]
  const { opportunity, health } = best

  const path = opportunity.stageHistory
    .slice(-2)
    .map((event) => STAGE_LABELS[event.stage])
    .join(' to ')

  return [
    {
      id: `opportunity.momentum:${opportunity.id}`,
      type: 'opportunity',
      category: 'opportunity',
      title: `${context.customerName(opportunity.customerId)} is moving`,
      description: `${fmt.currency(opportunity.value)} progressed ${path} while holding ${Math.round(opportunity.probability * 100)}% probability${moving.length > 1 ? `, one of ${moving.length} deals with real momentum` : ''}.`,
      entityType: 'opportunity',
      entityId: opportunity.id,
      entityName: context.customerName(opportunity.customerId),
      impact: weightedValue(opportunity),
      reason:
        'Deals that are both advancing and being worked are the ones most worth protecting.',
      triggers: [
        `${health.recentProgressions} stage moves in the last 60 days`,
        `Health score ${health.score}/100, in the healthy band`,
        `Probability of ${Math.round(opportunity.probability * 100)}%`,
        `Last activity ${health.inactiveDays === 0 ? 'today' : `${health.inactiveDays} days ago`}`,
      ],
      evidence: [
        { label: 'Value', value: fmt.currency(opportunity.value) },
        { label: 'Weighted', value: fmt.currency(weightedValue(opportunity)) },
        { label: 'Stage', value: STAGE_LABELS[opportunity.stage] },
        { label: 'Health score', value: `${health.score}/100` },
        { label: 'Owner', value: context.ownerName(opportunity.ownerId) },
        {
          label: 'Expected close',
          value: fmt.shortDate(opportunity.expectedCloseDate),
        },
      ],
      recommendation: 'Prioritise the closing strategy while the momentum is there.',
      action: { label: 'View opportunity', to: '/pipeline' },
      createdAt: opportunity.updatedAt,
      confidence: 0.8,
      daysUntil: health.daysToClose,
      positive: true,
    },
  ]
}

/** Pipeline in genuinely good shape. */
export function strongPipelineRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt, metrics } = context
  const strong = context.scored.filter(
    (entry) => entry.opportunity.probability >= 0.7 && entry.health.band === 'healthy',
  )

  if (strong.length < 2) return []
  const value = strong.reduce((sum, entry) => sum + entry.opportunity.value, 0)
  const weighted = strong.reduce(
    (sum, entry) => sum + weightedValue(entry.opportunity),
    0,
  )

  return [
    {
      id: 'opportunity.strong-pipeline',
      type: 'opportunity',
      category: 'pipeline',
      title: `${strong.length} deals are both likely and healthy`,
      description: `${fmt.currency(value)} of pipeline sits above 70% probability with no health concerns, worth ${fmt.currency(weighted)} weighted.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Open pipeline',
      impact: weighted,
      reason:
        'These need protecting more than they need working; losing one costs more than adding a new lead gains.',
      triggers: [
        `${strong.length} open deals above 70% probability`,
        'All of them score in the healthy band',
      ],
      evidence: [
        { label: 'Deals', value: `${strong.length}` },
        { label: 'Face value', value: fmt.currency(value) },
        { label: 'Weighted', value: fmt.currency(weighted) },
        {
          label: 'Share of pipeline',
          value:
            metrics.pipelineTotal > 0
              ? fmt.percent(value / metrics.pipelineTotal, 0)
              : '—',
        },
      ],
      recommendation: 'Protect these before chasing new volume.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt: context.metrics.period.start.toISOString(),
      confidence: 0.85,
      daysUntil: null,
      positive: true,
    },
  ]
}

/** The period is running ahead of the previous one. */
export function growthRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt, metrics } = context
  if (metrics.revenueDelta === null || metrics.revenueDelta < 0.1) return []
  if (metrics.previousRevenue <= 0) return []

  return [
    {
      id: 'opportunity.growth',
      type: 'opportunity',
      category: 'revenue',
      title: `Revenue is ${fmt.percent(metrics.revenueDelta, 0)} ahead of the previous period`,
      description: `${fmt.currency(metrics.revenue)} against ${fmt.currency(metrics.previousRevenue)} at the same point last period.`,
      entityType: 'company',
      entityId: null,
      entityName: context.workspace.company.name,
      impact: metrics.revenue - metrics.previousRevenue,
      reason: 'Worth understanding what changed while it is still fresh.',
      triggers: [
        `Growth of ${fmt.percent(metrics.revenueDelta, 0)} against the previous period`,
        `${metrics.wonCount} deals won so far this period`,
      ],
      evidence: [
        { label: 'Current', value: fmt.currency(metrics.revenue) },
        { label: 'Previous', value: fmt.currency(metrics.previousRevenue) },
        { label: 'Won deals', value: `${metrics.wonCount}` },
      ],
      recommendation: 'Identify the driver before assuming it repeats next period.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: metrics.period.start.toISOString(),
      confidence: 0.8,
      daysUntil: null,
      positive: true,
    },
  ]
}

/** Ahead of the pace the period requires. */
export function aheadOfPaceRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt, metrics } = context
  if (metrics.pace === null || metrics.pace < 1.05) return []

  return [
    {
      id: 'opportunity.ahead-of-pace',
      type: 'opportunity',
      category: 'forecast',
      title: `Ahead of the pace needed for the ${metrics.period.label.toLowerCase()}`,
      description: `${fmt.currency(metrics.revenue)} booked against ${fmt.currency(metrics.expectedByNow)} expected by today.`,
      entityType: 'company',
      entityId: null,
      entityName: context.workspace.company.name,
      impact: metrics.revenue - metrics.expectedByNow,
      reason:
        'The commitment is within reach; the question becomes how much further it can go.',
      triggers: [
        `Pace ratio of ${fmt.number(metrics.pace, 2)}, above 1.05`,
        `${fmt.percent(metrics.attainment ?? 0, 0)} of the target booked with ${fmt.percent(metrics.period.elapsedFraction, 0)} of the period elapsed`,
      ],
      evidence: [
        { label: 'Revenue', value: fmt.currency(metrics.revenue) },
        { label: 'Expected by today', value: fmt.currency(metrics.expectedByNow) },
        { label: 'Target', value: fmt.currency(metrics.target) },
      ],
      recommendation: 'Decide what to pull forward while there is room to do it.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: metrics.period.start.toISOString(),
      confidence: 0.85,
      daysUntil: metrics.period.remainingDays,
      positive: true,
    },
  ]
}

/** An account whose revenue is growing against its own history. */
export function growingCustomerRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt, customers } = context
  const candidates = customers
    .filter((entry) => entry.revenue > 0 && entry.openPipeline > entry.revenue)
    .sort((a, b) => b.openPipeline - a.openPipeline)

  if (candidates.length === 0) return []
  const best = candidates[0]

  return [
    {
      id: `opportunity.customer-growth:${best.customer.id}`,
      type: 'opportunity',
      category: 'customer',
      title: `${best.customer.name} is expanding`,
      description: `${fmt.currency(best.revenue)} booked this period with ${fmt.currency(best.openPipeline)} still open — more ahead of them than behind.`,
      entityType: 'customer',
      entityId: best.customer.id,
      entityName: best.customer.name,
      impact: best.openPipeline,
      reason: 'An account already buying, with more in play, is the cheapest revenue available.',
      triggers: [
        `${fmt.currency(best.revenue)} won this period`,
        `${fmt.currency(best.openPipeline)} of open pipeline, larger than the revenue booked`,
        `${best.wonDeals} deals closed with this account`,
      ],
      evidence: [
        { label: 'Revenue', value: fmt.currency(best.revenue) },
        { label: 'Open pipeline', value: fmt.currency(best.openPipeline) },
        { label: 'Won deals', value: `${best.wonDeals}` },
        { label: 'Industry', value: best.customer.industry },
      ],
      recommendation: 'Make sure the open opportunities there have senior attention.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: best.lastActivityAt ?? context.now.toISOString(),
      confidence: 0.7,
      daysUntil: null,
      positive: true,
    },
  ]
}

export function positiveRules(context: IntelligenceContext): InsightDraft[] {
  return [
    ...momentumRule(context),
    ...strongPipelineRule(context),
    ...growthRule(context),
    ...aheadOfPaceRule(context),
    ...growingCustomerRule(context),
  ]
}

export { T as POSITIVE_THRESHOLDS }
