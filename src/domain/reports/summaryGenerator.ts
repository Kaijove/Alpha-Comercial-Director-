import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import type { CommercialHealth } from '@/domain/health/commercialHealth'
import type { ForecastReport } from '@/domain/forecast/types'
import type { Insight } from '@/domain/intelligence/types'
import type { ReportPeriod } from './reportPeriods'

/**
 * The executive summary.
 *
 * Built from clauses, not from templates keyed to particular numbers: each
 * sentence is assembled from whichever facts are true, so the paragraph reads
 * differently for a period that beat target than for one that missed, without
 * anyone having written those two paragraphs. Nothing here is hardcoded to a
 * value, and no model is involved.
 *
 * The rule the whole file follows: every clause states something a calculation
 * produced, and a clause that has no figure behind it is not written at all.
 */
export interface SummaryInput {
  metrics: CommercialMetrics
  forecast: ForecastReport
  health: CommercialHealth
  insights: Insight[]
  period: ReportPeriod
  fmt: {
    currency: (value: number) => string
    percent: (ratio: number, decimals?: number) => string
    number: (value: number, decimals?: number) => string
  }
}

export function generateExecutiveSummary(input: SummaryInput): string[] {
  const { health, period, fmt } = input
  const paragraphs: string[] = []

  paragraphs.push(revenueParagraph(input))

  const outlook = period.isComplete ? closedOutlook(input) : forwardOutlook(input)
  if (outlook) paragraphs.push(outlook)

  const attention = attentionParagraph(input)
  if (attention) paragraphs.push(attention)

  // A closing line on the state of the business, from the health engine rather
  // than from an opinion formed here.
  paragraphs.push(
    `Commercial health stands at ${fmt.number(health.score, 0)} out of 100 - ${health.label.toLowerCase()}. ${health.summary}`,
  )

  return paragraphs
}

// ---------------------------------------------------------------------------

function revenueParagraph({ metrics, period, fmt }: SummaryInput): string {
  const clauses: string[] = []

  const verb = period.isComplete ? 'closed at' : 'has reached'
  const attainment =
    metrics.attainment !== null
      ? `, ${fmt.percent(metrics.attainment, 0)} of the ${fmt.currency(metrics.target)} ${periodNoun(period)} target`
      : ''

  clauses.push(`Revenue ${verb} ${fmt.currency(metrics.revenue)}${attainment}.`)

  if (metrics.revenueDelta !== null && metrics.previousRevenue > 0) {
    const direction = metrics.revenueDelta >= 0 ? 'up' : 'down'
    clauses.push(
      `That is ${direction} ${fmt.percent(Math.abs(metrics.revenueDelta), 0)} on the equivalent window of the previous ${periodNoun(period)}, when ${fmt.currency(metrics.previousRevenue)} was booked.`,
    )
  } else if (metrics.previousRevenue === 0) {
    clauses.push('There is no comparable revenue in the previous period to measure growth against.')
  }

  if (!period.isComplete && metrics.pace !== null) {
    const days = period.remainingDays
    const left = `${days} ${days === 1 ? 'day' : 'days'} left`
    clauses.push(
      metrics.pace >= 1
        ? `With ${left} in the period, revenue is running ahead of the ${fmt.currency(metrics.expectedByNow)} expected by this point.`
        : `With ${left} in the period, revenue is behind the ${fmt.currency(metrics.expectedByNow)} expected by this point.`,
    )
  }

  return clauses.join(' ')
}

function forwardOutlook({ metrics, forecast, fmt }: SummaryInput): string {
  const clauses: string[] = []

  clauses.push(
    `The base forecast indicates ${fmt.currency(forecast.value)} for the period, made up of ${fmt.currency(forecast.closedRevenue)} already closed and ${fmt.currency(forecast.expectedFromPipeline)} projected from open opportunities.`,
  )

  if (metrics.target > 0) {
    clauses.push(
      forecast.gapDetail.additionalRequired > 0
        ? `That leaves an estimated ${fmt.currency(forecast.gapDetail.additionalRequired)} gap to target.`
        : `That places the period ${fmt.currency(forecast.gap)} above target.`,
    )
  }

  clauses.push(
    `Probability of reaching target is assessed at ${fmt.percent(forecast.probability.score / 100, 0)}, at ${forecast.confidence.label.toLowerCase()}.`,
  )

  if (metrics.coverage !== null) {
    const healthy = metrics.coverage >= 3
    clauses.push(
      healthy
        ? `Pipeline coverage remains healthy at ${fmt.number(metrics.coverage, 1)} times the remaining target.`
        : `Pipeline coverage is thin at ${fmt.number(metrics.coverage, 1)} times the remaining target.`,
    )
  }

  return clauses.join(' ')
}

function closedOutlook({ metrics, fmt, period }: SummaryInput): string {
  const clauses: string[] = [
    `${period.title} has closed, so these figures are final rather than a projection.`,
  ]

  if (metrics.target > 0) {
    const gap = metrics.revenue - metrics.target
    clauses.push(
      gap >= 0
        ? `The period finished ${fmt.currency(gap)} above the ${fmt.currency(metrics.target)} commitment.`
        : `The period finished ${fmt.currency(Math.abs(gap))} short of the ${fmt.currency(metrics.target)} commitment.`,
    )
  }

  if (metrics.winRate !== null) {
    clauses.push(
      `${metrics.wonCount} of ${metrics.closedCount} closed opportunities were won, a ${fmt.percent(metrics.winRate, 0)} win rate.`,
    )
  }

  return clauses.join(' ')
}

function attentionParagraph({ forecast, insights, fmt }: SummaryInput): string | null {
  const clauses: string[] = []

  const critical = insights.filter(
    (insight) =>
      insight.severity === 'critical' &&
      insight.status !== 'dismissed' &&
      insight.status !== 'resolved',
  )
  const high = insights.filter(
    (insight) =>
      insight.severity === 'high' &&
      insight.status !== 'dismissed' &&
      insight.status !== 'resolved',
  )

  if (critical.length > 0 || high.length > 0) {
    const parts: string[] = []
    if (critical.length > 0) {
      parts.push(`${critical.length} critical ${critical.length === 1 ? 'issue' : 'issues'}`)
    }
    if (high.length > 0) {
      parts.push(`${high.length} high-priority ${high.length === 1 ? 'signal' : 'signals'}`)
    }
    clauses.push(`Commercial intelligence has raised ${joinList(parts)} for this period.`)
  }

  if (forecast.risk.total > 0) {
    clauses.push(
      `${fmt.currency(forecast.risk.total)} of forecast revenue sits in ${forecast.risk.entries.length} ${forecast.risk.entries.length === 1 ? 'opportunity' : 'opportunities'} the health assessment has flagged.`,
    )
  }

  if (forecast.timeline.backLoaded) {
    clauses.push(
      `${fmt.percent(forecast.timeline.lateShare, 0)} of projected revenue is expected in the final ${forecast.timeline.lateDays} days, which leaves little room to recover a slip.`,
    )
  }

  if (clauses.length === 0) return null
  return clauses.join(' ')
}

// ---------------------------------------------------------------------------

function periodNoun(period: ReportPeriod): string {
  switch (period.key) {
    case 'mtd':
      return 'month'
    case 'qtd':
      return 'quarter'
    case 'ytd':
      return 'year'
    default:
      return 'period'
  }
}

/** "a, b and c" — the one place list punctuation is decided. */
export function joinList(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
