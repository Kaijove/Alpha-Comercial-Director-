import { isWon, type CommercialDataset, type Opportunity } from '@/domain/commerce'
import { averageDealSize, revenueOf, winRateOf } from '@/domain/metrics/primitives'
import { closedIn, wonIn } from '@/domain/metrics/primitives'
import { startOfMonth } from '@/lib/dates'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type { IntelligenceContext } from './context'
import type { InsightDraft } from './types'

/**
 * Anomaly detection.
 *
 * A baseline is the mean of the completed months before the current one. A
 * signal fires when the current period moves away from it by more than a
 * configured threshold. Deliberately simple arithmetic rather than a model:
 * the point is that a director can check the number themselves.
 *
 * With fewer than `minBaselineMonths` of history nothing is reported at all -
 * an anomaly against one month of data is noise, and saying nothing is more
 * honest than saying something unfounded.
 */
export interface Baseline {
  months: number
  /** Mean revenue per completed month. */
  revenuePerMonth: number
  /** Mean count of opportunities created per completed month. */
  createdPerMonth: number
  /** Mean logged activities per completed month. */
  activitiesPerMonth: number
  averageDealSize: number | null
  winRate: number | null
  sufficient: boolean
}

const MONTHS_OF_HISTORY = 6

export function computeBaseline(dataset: CommercialDataset, now: Date): Baseline {
  const buckets: { start: Date; end: Date }[] = []
  for (let offset = MONTHS_OF_HISTORY; offset >= 1; offset -= 1) {
    const start = startOfMonth(now, -offset)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
    buckets.push({ start, end })
  }

  // Only months that actually contain data count towards the baseline.
  const populated = buckets.filter((bucket) =>
    dataset.opportunities.some(
      (opportunity) =>
        opportunity.closedAt !== null &&
        new Date(opportunity.closedAt) >= bucket.start &&
        new Date(opportunity.closedAt) <= bucket.end,
    ),
  )

  const months = populated.length
  if (months === 0) {
    return {
      months: 0,
      revenuePerMonth: 0,
      createdPerMonth: 0,
      activitiesPerMonth: 0,
      averageDealSize: null,
      winRate: null,
      sufficient: false,
    }
  }

  const inBaseline = (iso: string | null) =>
    iso !== null &&
    populated.some(
      (bucket) =>
        new Date(iso) >= bucket.start && new Date(iso) <= bucket.end,
    )

  const closed = dataset.opportunities.filter((opportunity) =>
    inBaseline(opportunity.closedAt),
  )
  const won = closed.filter(isWon)
  const created = dataset.opportunities.filter((opportunity) =>
    inBaseline(opportunity.createdAt),
  )
  const activities = dataset.activities.filter((activity) => inBaseline(activity.at))

  return {
    months,
    revenuePerMonth: revenueOf(won) / months,
    createdPerMonth: created.length / months,
    activitiesPerMonth: activities.length / months,
    averageDealSize: averageDealSize(won),
    winRate: winRateOf(closed),
    sufficient: months >= T.anomaly.minBaselineMonths,
  }
}

/** Scales a monthly baseline to the share of a month the period covers. */
function scaleToPeriod(perMonth: number, days: number): number {
  return perMonth * (days / 30.44)
}

export function detectAnomalies(
  context: IntelligenceContext,
  baseline: Baseline,
): InsightDraft[] {
  if (!baseline.sufficient) return []

  const { metrics, fmt, dataset, now } = context
  const drafts: InsightDraft[] = []
  const periodDays = metrics.period.elapsedDays
  const since = metrics.period.start.toISOString()

  const relative = (current: number, expected: number) =>
    expected > 0 ? (current - expected) / expected : null

  // --- Revenue against the monthly baseline --------------------------------
  const expectedRevenue = scaleToPeriod(baseline.revenuePerMonth, periodDays)
  const revenueMove = relative(metrics.revenue, expectedRevenue)
  if (revenueMove !== null && Math.abs(revenueMove) >= T.anomaly.revenue) {
    const down = revenueMove < 0
    drafts.push({
      id: 'anomaly.revenue',
      type: 'anomaly',
      category: 'anomaly',
      title: `Revenue is ${fmt.percent(Math.abs(revenueMove), 0)} ${down ? 'below' : 'above'} the usual run rate`,
      description: `${fmt.currency(metrics.revenue)} booked so far this period against ${fmt.currency(expectedRevenue)} expected from the last ${baseline.months} months.`,
      entityType: 'company',
      entityId: null,
      entityName: context.workspace.company.name,
      impact: Math.abs(metrics.revenue - expectedRevenue),
      reason: down
        ? 'The gap is larger than normal month-to-month variation.'
        : 'The period is running materially ahead of the usual pattern.',
      triggers: [
        `Baseline of ${fmt.currency(baseline.revenuePerMonth)} per month over ${baseline.months} months`,
        `Current period scaled to ${periodDays} days gives ${fmt.currency(expectedRevenue)}`,
        `Difference of ${fmt.percent(Math.abs(revenueMove), 0)} exceeds the ${fmt.percent(T.anomaly.revenue, 0)} threshold`,
      ],
      evidence: [
        { label: 'Current', value: fmt.currency(metrics.revenue) },
        { label: 'Baseline', value: fmt.currency(expectedRevenue) },
        {
          label: 'Difference',
          value: `${revenueMove >= 0 ? '+' : '-'}${fmt.currency(Math.abs(metrics.revenue - expectedRevenue))}`,
        },
        { label: 'Baseline months', value: `${baseline.months}` },
      ],
      recommendation: down
        ? 'Check whether this is timing or a real slowdown in closing.'
        : 'Understand what is driving it before assuming it repeats.',
      action: { label: 'View analytics', to: '/analytics' },
      createdAt: since,
      confidence: 0.75,
      daysUntil: null,
      positive: !down,
    })
  }

  // --- Win rate against the previous period --------------------------------
  if (
    metrics.winRate !== null &&
    metrics.previousWinRate !== null &&
    metrics.closedCount >= T.minClosedForRate
  ) {
    const move = metrics.winRate - metrics.previousWinRate
    if (Math.abs(move) >= T.anomaly.winRate) {
      const down = move < 0
      drafts.push({
        id: 'anomaly.win-rate',
        type: 'anomaly',
        category: 'anomaly',
        title: `Win rate ${down ? 'dropped' : 'rose'} from ${fmt.percent(metrics.previousWinRate, 0)} to ${fmt.percent(metrics.winRate, 0)}`,
        description: `Across ${metrics.closedCount} deals closed this period, against the previous one.`,
        entityType: 'company',
        entityId: null,
        entityName: context.workspace.company.name,
        impact: null,
        reason: down
          ? 'A drop of this size usually points at qualification rather than effort.'
          : 'Conversion is materially better than the previous period.',
        triggers: [
          `Change of ${fmt.number(Math.abs(move) * 100, 1)} pp exceeds the ${fmt.number(T.anomaly.winRate * 100, 0)} pp threshold`,
          `${metrics.closedCount} closed deals, above the ${T.minClosedForRate} needed for the rate to mean anything`,
        ],
        evidence: [
          { label: 'Current', value: fmt.percent(metrics.winRate, 1) },
          { label: 'Previous', value: fmt.percent(metrics.previousWinRate, 1) },
          {
            label: 'Difference',
            value: `${move >= 0 ? '+' : '-'}${fmt.number(Math.abs(move) * 100, 1)} pp`,
          },
          { label: 'Closed deals', value: `${metrics.closedCount}` },
        ],
        recommendation: down
          ? 'Look at where deals are being lost, by stage.'
          : 'Find what changed and make it repeatable.',
        action: { label: 'View analytics', to: '/analytics' },
        createdAt: since,
        confidence: 0.8,
        daysUntil: null,
        positive: !down,
      })
    }
  }

  // --- New pipeline created against the baseline ---------------------------
  const createdThisPeriod = dataset.opportunities.filter(
    (opportunity: Opportunity) =>
      new Date(opportunity.createdAt) >= metrics.period.start &&
      new Date(opportunity.createdAt) <= now,
  ).length
  const expectedCreated = scaleToPeriod(baseline.createdPerMonth, periodDays)
  const createdMove = relative(createdThisPeriod, expectedCreated)

  if (
    createdMove !== null &&
    Math.abs(createdMove) >= T.anomaly.pipeline &&
    expectedCreated >= 3
  ) {
    const down = createdMove < 0
    drafts.push({
      id: 'anomaly.pipeline-creation',
      type: 'anomaly',
      category: 'anomaly',
      title: `New pipeline is being created ${fmt.percent(Math.abs(createdMove), 0)} ${down ? 'slower' : 'faster'} than usual`,
      description: `${createdThisPeriod} opportunities created this period against ${fmt.number(expectedCreated, 0)} expected from the baseline.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Pipeline creation',
      impact: null,
      reason: down
        ? 'Today’s prospecting is next quarter’s revenue; a slowdown shows up late.'
        : 'Pipeline generation is running ahead of the usual rate.',
      triggers: [
        `Baseline of ${fmt.number(baseline.createdPerMonth, 1)} new opportunities per month`,
        `${createdThisPeriod} created in the ${periodDays} days of this period`,
      ],
      evidence: [
        { label: 'Created', value: `${createdThisPeriod}` },
        { label: 'Baseline', value: fmt.number(expectedCreated, 0) },
        { label: 'Baseline months', value: `${baseline.months}` },
      ],
      recommendation: down
        ? 'Check prospecting volume before the gap reaches the forecast.'
        : 'Make sure qualification is keeping up with the volume.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt: since,
      confidence: 0.7,
      daysUntil: null,
      positive: !down,
    })
  }

  // --- Average deal size ----------------------------------------------------
  if (baseline.averageDealSize !== null && metrics.averageDealSize !== null) {
    const move = relative(metrics.averageDealSize, baseline.averageDealSize)
    if (move !== null && Math.abs(move) >= T.anomaly.dealSize && metrics.wonCount >= 3) {
      const down = move < 0
      drafts.push({
        id: 'anomaly.deal-size',
        type: 'anomaly',
        category: 'anomaly',
        title: `Average deal size is ${fmt.percent(Math.abs(move), 0)} ${down ? 'smaller' : 'larger'} than usual`,
        description: `${fmt.currency(metrics.averageDealSize)} across ${metrics.wonCount} won deals, against a baseline of ${fmt.currency(baseline.averageDealSize)}.`,
        entityType: 'company',
        entityId: null,
        entityName: context.workspace.company.name,
        impact: null,
        reason: down
          ? 'Smaller deals mean more of them are needed to reach the same number.'
          : 'Larger deals usually take longer, which changes how the forecast should be read.',
        triggers: [
          `Baseline average of ${fmt.currency(baseline.averageDealSize)} over ${baseline.months} months`,
          `Move of ${fmt.percent(Math.abs(move), 0)} exceeds the ${fmt.percent(T.anomaly.dealSize, 0)} threshold`,
        ],
        evidence: [
          { label: 'Current', value: fmt.currency(metrics.averageDealSize) },
          { label: 'Baseline', value: fmt.currency(baseline.averageDealSize) },
          { label: 'Won deals', value: `${metrics.wonCount}` },
        ],
        recommendation: 'Check the mix of what is being won before reading the trend.',
        action: { label: 'View analytics', to: '/analytics' },
        createdAt: since,
        confidence: 0.65,
        daysUntil: null,
        positive: !down,
      })
    }
  }

  // --- Logged activity ------------------------------------------------------
  const activitiesThisPeriod = dataset.activities.filter(
    (activity) =>
      new Date(activity.at) >= metrics.period.start && new Date(activity.at) <= now,
  ).length
  const expectedActivities = scaleToPeriod(baseline.activitiesPerMonth, periodDays)
  const activityMove = relative(activitiesThisPeriod, expectedActivities)

  if (
    activityMove !== null &&
    activityMove <= -T.anomaly.activity &&
    expectedActivities >= 5
  ) {
    drafts.push({
      id: 'anomaly.activity',
      type: 'anomaly',
      category: 'activity',
      title: `Logged activity is ${fmt.percent(Math.abs(activityMove), 0)} below the usual rate`,
      description: `${activitiesThisPeriod} activities recorded this period against ${fmt.number(expectedActivities, 0)} expected.`,
      entityType: 'company',
      entityId: null,
      entityName: context.workspace.company.name,
      impact: null,
      reason:
        'This may be a real drop in contact, or simply that activity is not being recorded. Both are worth knowing.',
      triggers: [
        `Baseline of ${fmt.number(baseline.activitiesPerMonth, 0)} activities per month`,
        `Drop of ${fmt.percent(Math.abs(activityMove), 0)} exceeds the ${fmt.percent(T.anomaly.activity, 0)} threshold`,
      ],
      evidence: [
        { label: 'Recorded', value: `${activitiesThisPeriod}` },
        { label: 'Baseline', value: fmt.number(expectedActivities, 0) },
      ],
      recommendation: 'Confirm whether contact dropped or only the recording of it.',
      action: { label: 'View team', to: '/team' },
      createdAt: since,
      confidence: 0.6,
      daysUntil: null,
    })
  }

  // --- A rep moving away from their own history ----------------------------
  for (const rep of context.reps) {
    const owned = context.dataset.opportunities.filter(
      (opportunity) => opportunity.ownerId === rep.owner.id,
    )
    const repBaselineMonths = baseline.months
    const historicRevenue = revenueOf(
      wonIn(owned, {
        start: startOfMonth(now, -repBaselineMonths),
        end: startOfMonth(now),
      }),
    )
    const perMonth = historicRevenue / Math.max(1, repBaselineMonths)
    const expected = scaleToPeriod(perMonth, periodDays)
    const move = relative(rep.revenue, expected)

    if (move !== null && move <= -0.5 && expected > 0 && closedIn(owned, metrics.period).length > 0) {
      drafts.push({
        id: `anomaly.rep:${rep.owner.id}`,
        type: 'anomaly',
        category: 'anomaly',
        title: `${rep.owner.name} is well below their own run rate`,
        description: `${fmt.currency(rep.revenue)} this period against ${fmt.currency(expected)} expected from their last ${repBaselineMonths} months.`,
        entityType: 'rep',
        entityId: rep.owner.id,
        entityName: rep.owner.name,
        impact: Math.max(0, expected - rep.revenue),
        reason:
          'Measured against their own history rather than the team, so a naturally smaller territory is not penalised.',
        triggers: [
          `Personal baseline of ${fmt.currency(perMonth)} per month`,
          `Current period is ${fmt.percent(Math.abs(move), 0)} below it`,
        ],
        evidence: [
          { label: 'Current', value: fmt.currency(rep.revenue) },
          { label: 'Own baseline', value: fmt.currency(expected) },
          { label: 'Open pipeline', value: fmt.currency(rep.pipeline) },
        ],
        recommendation: 'Check whether this is a timing gap or a pipeline problem.',
        action: { label: 'View team performance', to: '/team' },
        createdAt: since,
        confidence: 0.7,
        daysUntil: null,
      })
    }
  }

  return drafts
}
