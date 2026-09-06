import { STAGE_LABELS, type Opportunity } from '@/domain/commerce'
import { weightedValue } from '@/domain/metrics/primitives'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type { IntelligenceContext } from './context'
import type { InsightDraft } from './types'
import type { ScoredOpportunity } from './opportunityScoring'

/**
 * Revenue at risk, counted once per opportunity.
 *
 * The naive version adds a deal's value under every rule it trips - stalled,
 * closing soon, low probability - and reports triple the real exposure. Here
 * each open deal gets exactly **one** classification, its health band, and only
 * deals in the two worst bands contribute.
 *
 * What they contribute is their **weighted value**, because that is the amount
 * the forecast is actually counting on. Face value would overstate the loss for
 * a deal that was never likely to close anyway.
 */
export interface RevenueAtRiskEntry {
  opportunity: Opportunity
  scored: ScoredOpportunity
  /** Weighted value: what the forecast stands to lose. */
  amount: number
  primaryReason: string
  recommendation: string
}

export interface RevenueAtRiskReport {
  total: number
  entries: RevenueAtRiskEntry[]
  /** Stated in the UI so the number is never a black box. */
  methodology: string
}

export function computeRevenueAtRisk(
  context: IntelligenceContext,
): RevenueAtRiskReport {
  const entries: RevenueAtRiskEntry[] = context.scored
    .filter(
      (entry) => entry.health.band === 'at-risk' || entry.health.band === 'critical',
    )
    .map((entry) => ({
      opportunity: entry.opportunity,
      scored: entry,
      amount: weightedValue(entry.opportunity),
      primaryReason: entry.health.reason,
      recommendation: recommendFor(entry),
    }))
    .sort((a, b) => b.amount - a.amount)

  return {
    total: entries.reduce((sum, entry) => sum + entry.amount, 0),
    entries,
    methodology:
      'Each open deal is classified once, by its health score. Deals in the At risk and Critical bands contribute their weighted value — value multiplied by probability — so no opportunity is counted twice and the figure reflects what the forecast stands to lose.',
  }
}

function recommendFor(entry: ScoredOpportunity): string {
  const { health, opportunity } = entry
  if (health.daysToClose < 0) {
    return 'Re-date the deal or move it out of the forecast.'
  }
  if (health.inactiveDays >= T.stalledDays) {
    return 'Make contact and record the outcome before the close date.'
  }
  if (opportunity.probability < T.fragileProbability) {
    return 'Confirm the decision path, or reset the probability to what is real.'
  }
  return 'Review the deal and confirm it is still on track.'
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** One aggregate signal for the whole exposure, plus the worst few deals. */
export function revenueAtRiskRules(
  context: IntelligenceContext,
  report: RevenueAtRiskReport,
): InsightDraft[] {
  if (report.entries.length === 0) return []
  const { fmt, metrics } = context
  const drafts: InsightDraft[] = []

  const share =
    metrics.remainingToTarget > 0 ? report.total / metrics.remainingToTarget : null

  drafts.push({
    id: 'risk.revenue-at-risk',
    type: 'risk',
    category: 'revenue',
    title: `${fmt.currency(report.total)} of forecast revenue is at risk`,
    description: `${report.entries.length} open ${report.entries.length === 1 ? 'deal is' : 'deals are'} in the At risk or Critical health band. Their combined weighted value is what the forecast stands to lose if nothing changes.`,
    entityType: 'company',
    entityId: null,
    entityName: context.workspace.company.name,
    impact: report.total,
    reason:
      share !== null
        ? `That is ${fmt.percent(share, 0)} of the ${fmt.currency(metrics.remainingToTarget)} still needed this period.`
        : 'The period target is already covered, but the exposure still affects the forecast.',
    triggers: [
      `${report.entries.length} open deals scored below the At risk health threshold`,
      'Each deal counted once, at weighted value',
    ],
    evidence: [
      { label: 'Deals at risk', value: `${report.entries.length}` },
      { label: 'Weighted exposure', value: fmt.currency(report.total) },
      {
        label: 'Remaining target',
        value: fmt.currency(metrics.remainingToTarget),
      },
    ],
    recommendation: 'Work the list in Revenue at Risk, largest exposure first.',
    action: { label: 'Review pipeline', to: '/pipeline' },
    createdAt: context.now.toISOString(),
    confidence: 0.9,
    daysUntil: null,
  })

  // The individual deals worth naming: the highest-scoring few. Naming every
  // one of them would bury the signal under its own instances.
  const named = [...report.entries]
    .sort((a, b) => b.scored.score - a.scored.score)
    .slice(0, 4)

  for (const entry of named) {
    const { opportunity, health } = entry.scored
    drafts.push({
      id: `risk.opportunity:${opportunity.id}`,
      type: 'risk',
      category: 'opportunity',
      title: `${context.customerName(opportunity.customerId)} — ${fmt.currency(opportunity.value)} needs attention`,
      description: `${opportunity.name} in ${STAGE_LABELS[opportunity.stage]}, ${Math.round(opportunity.probability * 100)}% probability, ${health.daysToClose < 0 ? `${Math.abs(health.daysToClose)} days overdue` : `closing in ${health.daysToClose} days`}.`,
      entityType: 'opportunity',
      entityId: opportunity.id,
      entityName: context.customerName(opportunity.customerId),
      impact: entry.amount,
      reason: health.reason,
      triggers: health.factors,
      evidence: [
        { label: 'Value', value: fmt.currency(opportunity.value) },
        { label: 'Probability', value: `${Math.round(opportunity.probability * 100)}%` },
        { label: 'Weighted', value: fmt.currency(entry.amount) },
        { label: 'Health score', value: `${health.score}/100` },
        { label: 'Owner', value: context.ownerName(opportunity.ownerId) },
        {
          label: 'Expected close',
          value: fmt.shortDate(opportunity.expectedCloseDate),
        },
      ],
      recommendation: entry.recommendation,
      action: { label: 'View opportunity', to: '/pipeline' },
      createdAt: opportunity.lastActivityAt,
      confidence: 0.85,
      daysUntil: health.daysToClose,
    })
  }

  return drafts
}

/** The business is not on pace to reach the period commitment. */
export function targetRiskRule(context: IntelligenceContext): InsightDraft[] {
  const { metrics, fmt } = context
  if (metrics.pace === null || metrics.pace >= 0.9 || metrics.target <= 0) return []

  // Behind pace and forecast to land short are two readings of one problem. The
  // forecast rule is the better of the two - it accounts for what the pipeline
  // is expected to add - so when it fires, this one stands down rather than
  // saying the same thing again in weaker terms. Behind pace with a forecast
  // that still reaches target is a genuinely different signal, and survives.
  if (metrics.forecast.gapDetail.additionalRequired > 0) return []

  const shortfall = metrics.expectedByNow - metrics.revenue

  return [
    {
      id: 'risk.target-pace',
      type: 'risk',
      category: 'forecast',
      title: `Revenue is ${fmt.currency(shortfall)} behind the pace needed`,
      description: `${fmt.currency(metrics.revenue)} booked against ${fmt.currency(metrics.expectedByNow)} expected by today, with ${metrics.period.remainingDays} days left in the period.`,
      entityType: 'company',
      entityId: null,
      entityName: context.workspace.company.name,
      impact: shortfall,
      reason: `At this rate the period lands near ${fmt.currency(metrics.forecast.value)} against a ${fmt.currency(metrics.target)} commitment.`,
      triggers: [
        `Attainment is ${fmt.percent(metrics.attainment ?? 0, 1)} with ${fmt.percent(metrics.period.elapsedFraction, 0)} of the period elapsed`,
        `Pace ratio is ${fmt.number(metrics.pace, 2)}, below the 0.90 threshold`,
      ],
      evidence: [
        { label: 'Revenue', value: fmt.currency(metrics.revenue) },
        { label: 'Expected by today', value: fmt.currency(metrics.expectedByNow) },
        { label: 'Target', value: fmt.currency(metrics.target) },
        {
          label: 'Needed per day',
          value:
            metrics.perDayNeeded !== null ? fmt.currency(metrics.perDayNeeded) : '—',
        },
      ],
      recommendation:
        'Pull forward what can close, and check the pipeline covers the rest.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: metrics.period.start.toISOString(),
      confidence: 0.9,
      daysUntil: metrics.period.remainingDays,
    },
  ]
}

/** Not enough open pipeline to support what is left of the target. */
export function pipelineGapRule(context: IntelligenceContext): InsightDraft[] {
  const { metrics, fmt } = context
  if (metrics.coverage === null || metrics.coverage >= T.healthyCoverage) return []
  if (metrics.remainingToTarget <= 0) return []

  // How much more pipeline healthy coverage would require.
  const required = metrics.remainingToTarget * T.healthyCoverage
  const missing = Math.max(0, required - metrics.pipelineTotal)

  return [
    {
      id: 'risk.pipeline-gap',
      type: 'risk',
      category: 'pipeline',
      title: `Pipeline coverage is ${fmt.number(metrics.coverage, 2)}x, below the ${T.healthyCoverage}x threshold`,
      description: `${fmt.currency(metrics.pipelineTotal)} of open pipeline against ${fmt.currency(metrics.remainingToTarget)} still to book. Healthy coverage would need roughly ${fmt.currency(required)}.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Open pipeline',
      impact: missing,
      reason: `Around ${fmt.currency(missing)} of additional pipeline is required to keep a healthy path to target.`,
      triggers: [
        `Coverage of ${fmt.number(metrics.coverage, 2)}x is below the configured ${T.healthyCoverage}x`,
        `${fmt.currency(metrics.remainingToTarget)} of the period target is unbooked`,
      ],
      evidence: [
        { label: 'Open pipeline', value: fmt.currency(metrics.pipelineTotal) },
        { label: 'Remaining target', value: fmt.currency(metrics.remainingToTarget) },
        { label: 'Coverage', value: `${fmt.number(metrics.coverage, 2)}x` },
        { label: 'Pipeline needed', value: fmt.currency(missing) },
      ],
      recommendation:
        'Generating new opportunities will move this further than closing faster.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt: metrics.period.start.toISOString(),
      confidence: metrics.coverage < T.criticalCoverage ? 0.95 : 0.8,
      daysUntil: metrics.period.remainingDays,
    },
  ]
}

/** High-value deals that have gone quiet, ranked by what is at stake. */
export function stalledDealRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt } = context
  const stalled = context.scored
    .filter((entry) => entry.health.inactiveDays >= T.stalledDays)
    .sort((a, b) => b.score - a.score)

  if (stalled.length === 0) return []

  const value = stalled.reduce((sum, entry) => sum + entry.opportunity.value, 0)
  const worst = stalled[0]

  return [
    {
      id: 'risk.stalled',
      type: 'risk',
      category: 'activity',
      title: `${stalled.length} ${stalled.length === 1 ? 'opportunity has' : 'opportunities have'} gone quiet`,
      description: `${fmt.currency(value)} of open pipeline has had no recorded activity for ${T.stalledDays} days or more. The largest is ${context.customerName(worst.opportunity.customerId)} at ${fmt.currency(worst.opportunity.value)} in ${STAGE_LABELS[worst.opportunity.stage]}.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Stalled opportunities',
      impact: stalled.reduce((sum, entry) => sum + weightedValue(entry.opportunity), 0),
      reason:
        'Late-stage deals with a near close date are ranked first, because silence costs most there.',
      triggers: [
        `${stalled.length} open deals with no activity for ${T.stalledDays}+ days`,
        `Ranked by opportunity score, which blends value, probability, urgency and health`,
      ],
      evidence: [
        { label: 'Stalled deals', value: `${stalled.length}` },
        { label: 'Face value', value: fmt.currency(value) },
        {
          label: 'Longest silence',
          value: `${Math.max(...stalled.map((entry) => entry.health.inactiveDays))} days`,
        },
      ],
      recommendation: 'Review the stalled list and re-date or re-engage each one.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt: worst.opportunity.lastActivityAt,
      confidence: 0.9,
      daysUntil: worst.health.daysToClose,
    },
  ]
}

/** Deals about to land, ordered by what deserves attention first. */
export function closingSoonRule(context: IntelligenceContext): InsightDraft[] {
  const { fmt } = context
  const closing = context.scored
    .filter(
      (entry) =>
        entry.health.daysToClose >= 0 &&
        entry.health.daysToClose <= T.closingSoonDays,
    )
    .sort((a, b) => b.score - a.score)

  if (closing.length === 0) return []

  const value = closing.reduce((sum, entry) => sum + entry.opportunity.value, 0)
  const weighted = closing.reduce(
    (sum, entry) => sum + weightedValue(entry.opportunity),
    0,
  )
  const fragile = closing.filter(
    (entry) => entry.health.band === 'at-risk' || entry.health.band === 'critical',
  )

  return [
    {
      id: 'opportunity.closing-soon',
      type: 'opportunity',
      category: 'opportunity',
      title: `${closing.length} ${closing.length === 1 ? 'opportunity is' : 'opportunities are'} expected to close within ${T.closingSoonDays} days`,
      description: `${fmt.currency(value)} of face value, ${fmt.currency(weighted)} weighted.${fragile.length > 0 ? ` ${fragile.length} of them ${fragile.length === 1 ? 'is' : 'are'} not in good shape.` : ''}`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Closing soon',
      impact: weighted,
      reason:
        fragile.length > 0
          ? 'Some of these are quiet or thinly qualified this close to the date.'
          : 'These are the deals that decide the period.',
      triggers: [
        `${closing.length} open deals with an expected close inside ${T.closingSoonDays} days`,
        ...(fragile.length > 0
          ? [`${fragile.length} of them score below the At risk health threshold`]
          : []),
      ],
      evidence: [
        { label: 'Deals', value: `${closing.length}` },
        { label: 'Face value', value: fmt.currency(value) },
        { label: 'Weighted', value: fmt.currency(weighted) },
        { label: 'Needing attention', value: `${fragile.length}` },
      ],
      recommendation:
        fragile.length > 0
          ? 'Confirm the shaky ones first; the healthy ones mostly need protecting.'
          : 'Protect these before chasing new volume.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt: context.now.toISOString(),
      confidence: 0.85,
      daysUntil: closing[0].health.daysToClose,
      positive: fragile.length === 0,
    },
  ]
}

/** Too much of the period riding on too few accounts. */
export function customerConcentrationRule(
  context: IntelligenceContext,
): InsightDraft[] {
  const { fmt, customers, metrics } = context
  const withRevenue = customers
    .filter((entry) => entry.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)

  // Concentration across two or three accounts is meaningless; say nothing.
  if (withRevenue.length < T.concentrationAccounts + 2) return []

  const total = withRevenue.reduce((sum, entry) => sum + entry.revenue, 0)
  if (total <= 0) return []

  const top = withRevenue.slice(0, T.concentrationAccounts)
  const share = top.reduce((sum, entry) => sum + entry.revenue, 0) / total
  if (share < T.customerConcentration) return []

  return [
    {
      id: 'risk.customer-concentration',
      type: 'risk',
      category: 'customer',
      title: `${fmt.percent(share, 0)} of revenue came from ${top.length} accounts`,
      description: `${top.map((entry) => entry.customer.name).join(', ')} account for ${fmt.currency(top.reduce((sum, entry) => sum + entry.revenue, 0))} of ${fmt.currency(total)} booked this period.`,
      entityType: 'customer',
      entityId: null,
      entityName: 'Top accounts',
      impact: top.reduce((sum, entry) => sum + entry.revenue, 0),
      reason:
        'A period this dependent on a few accounts turns on decisions made outside the team.',
      triggers: [
        `Top ${top.length} accounts hold ${fmt.percent(share, 0)} of period revenue`,
        `Above the ${fmt.percent(T.customerConcentration, 0)} concentration threshold`,
        `${withRevenue.length} accounts generated revenue in total`,
      ],
      evidence: top.map((entry) => ({
        label: entry.customer.name,
        value: fmt.currency(entry.revenue),
      })),
      recommendation:
        'Widen the account base, and protect the relationships the period depends on.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: metrics.period.start.toISOString(),
      confidence: 0.8,
      daysUntil: null,
    },
  ]
}
