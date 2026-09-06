import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import type { RepMetrics } from '@/domain/metrics/teamMetrics'
import type { CustomerStat } from '@/domain/metrics/customers'
import type { ForecastReport } from '@/domain/forecast/types'
import type { Insight } from '@/domain/intelligence/types'
import { INTELLIGENCE_THRESHOLDS as T } from '@/domain/intelligence/thresholds'
import type { ReportHighlight, ReportHighlights } from './types'

/**
 * Management highlights.
 *
 * Three short lists a director can read in fifteen seconds: what went well,
 * what needs attention, and what to do about it.
 *
 * Every entry is a fact with a figure attached, drawn from engines that already
 * ran. Recommended actions come from the intelligence insights themselves
 * rather than from a second set of rules written here - so an action in a report
 * and an action on the Intelligence page are the same action.
 */
export interface HighlightsInput {
  metrics: CommercialMetrics
  forecast: ForecastReport
  insights: Insight[]
  reps: RepMetrics[]
  customers: CustomerStat[]
  fmt: {
    currency: (value: number) => string
    percent: (ratio: number, decimals?: number) => string
    number: (value: number, decimals?: number) => string
  }
}

const MAX_PER_LIST = 5

export function buildHighlights(input: HighlightsInput): ReportHighlights {
  return {
    positive: positives(input).slice(0, MAX_PER_LIST),
    attention: attentions(input).slice(0, MAX_PER_LIST),
    actions: actions(input).slice(0, MAX_PER_LIST),
  }
}

function positives({
  metrics,
  forecast,
  reps,
  customers,
  fmt,
}: HighlightsInput): ReportHighlight[] {
  const items: ReportHighlight[] = []

  if (metrics.revenueDelta !== null && metrics.revenueDelta > 0) {
    items.push({
      text: `Revenue grew ${fmt.percent(metrics.revenueDelta, 0)} against the previous period`,
      detail: `${fmt.currency(metrics.revenue)} against ${fmt.currency(metrics.previousRevenue)}.`,
    })
  }

  if (metrics.target > 0 && forecast.gap >= 0) {
    items.push({
      text: `Forecast lands ${fmt.currency(forecast.gap)} above target`,
      detail: `${fmt.currency(forecast.value)} projected against a ${fmt.currency(metrics.target)} commitment.`,
    })
  }

  if (metrics.coverage !== null && metrics.coverage >= T.healthyCoverage) {
    items.push({
      text: `Pipeline covers the remaining target ${fmt.number(metrics.coverage, 1)} times over`,
      detail: `${fmt.currency(metrics.pipelineTotal)} open against ${fmt.currency(metrics.remainingToTarget)} still to book.`,
    })
  }

  const leader = [...reps]
    .filter((rep) => rep.attainment !== null)
    .sort((a, b) => (b.attainment ?? 0) - (a.attainment ?? 0))[0]
  if (leader && (leader.attainment ?? 0) >= 1) {
    items.push({
      text: `${leader.owner.name} is at ${fmt.percent(leader.attainment ?? 0, 0)} of their target`,
      detail: `${fmt.currency(leader.revenue)} booked against ${fmt.currency(leader.target)}.`,
    })
  }

  const healthy = forecast.contributions.filter((entry) => entry.health.band === 'healthy')
  if (healthy.length > 0) {
    const value = healthy.reduce((total, entry) => total + entry.contribution, 0)
    items.push({
      text: `${healthy.length} healthy ${healthy.length === 1 ? 'opportunity is' : 'opportunities are'} due before the period ends`,
      detail: `Worth ${fmt.currency(value)} of the forecast.`,
    })
  }

  const growing = [...customers]
    .filter((customer) => customer.revenue > 0 && customer.openPipeline > customer.revenue)
    .sort((a, b) => b.openPipeline - a.openPipeline)[0]
  if (growing) {
    items.push({
      text: `${growing.customer.name} has more ahead than behind`,
      detail: `${fmt.currency(growing.revenue)} booked with ${fmt.currency(growing.openPipeline)} still open.`,
    })
  }

  if (metrics.winRateDelta !== null && metrics.winRateDelta > 0 && metrics.winRate !== null) {
    items.push({
      text: `Win rate improved to ${fmt.percent(metrics.winRate, 0)}`,
      detail: `Up ${fmt.number(metrics.winRateDelta * 100, 1)} points on the previous period.`,
    })
  }

  return items
}

function attentions({ metrics, forecast, insights, fmt }: HighlightsInput): ReportHighlight[] {
  const items: ReportHighlight[] = []

  if (metrics.target > 0 && forecast.gapDetail.additionalRequired > 0) {
    items.push({
      text: `Forecast is ${fmt.currency(forecast.gapDetail.additionalRequired)} short of target`,
      detail: forecast.gapDetail.summary,
    })
  }

  if (metrics.coverage !== null && metrics.coverage < T.healthyCoverage) {
    items.push({
      text: `Pipeline coverage is ${fmt.number(metrics.coverage, 1)}x, below the ${T.healthyCoverage}x threshold`,
      detail: `${fmt.currency(metrics.pipelineTotal)} open against ${fmt.currency(metrics.remainingToTarget)} still to book.`,
    })
  }

  const stalled = forecast.contributions.filter(
    (entry) => entry.health.inactiveDays >= T.stalledDays,
  )
  if (stalled.length > 0) {
    const value = stalled.reduce((total, entry) => total + entry.opportunity.value, 0)
    items.push({
      text: `${stalled.length} ${stalled.length === 1 ? 'opportunity in the forecast has' : 'opportunities in the forecast have'} gone quiet`,
      detail: `${fmt.currency(value)} of face value with no activity for ${T.stalledDays} days or more.`,
    })
  }

  if (metrics.winRateDelta !== null && metrics.winRateDelta < 0 && metrics.winRate !== null) {
    items.push({
      text: `Win rate fell to ${fmt.percent(metrics.winRate, 0)}`,
      detail: `Down ${fmt.number(Math.abs(metrics.winRateDelta) * 100, 1)} points on the previous period.`,
    })
  }

  const top = [...forecast.contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, T.concentrationAccounts)
  const openForecast = forecast.expectedFromPipeline
  if (openForecast > 0 && top.length > 0) {
    const share = top.reduce((total, entry) => total + entry.contribution, 0) / openForecast
    if (share >= 0.35) {
      items.push({
        text: `${fmt.percent(share, 0)} of projected pipeline revenue rests on ${top.length} ${top.length === 1 ? 'opportunity' : 'opportunities'}`,
        detail: 'A slip on any of them moves the period.',
      })
    }
  }

  // Anything the intelligence engine called critical, without restating what is
  // already in the lists above.
  const covered = new Set(['forecast.gap', 'risk.pipeline-gap', 'risk.stalled'])
  for (const insight of insights) {
    if (insight.severity !== 'critical') continue
    if (insight.status === 'dismissed' || insight.status === 'resolved') continue
    if (covered.has(insight.id)) continue
    items.push({ text: insight.title, detail: insight.description })
  }

  return items
}

/**
 * Recommended actions come straight from the insights the Intelligence engine
 * already ranked, highest priority first. Reports do not decide what a director
 * should do - the engine that scored the problem does.
 */
function actions({ insights, forecast }: HighlightsInput): ReportHighlight[] {
  const items: ReportHighlight[] = []

  const live = insights
    .filter(
      (insight) =>
        insight.status !== 'dismissed' &&
        insight.status !== 'resolved' &&
        insight.severity !== 'positive' &&
        insight.severity !== 'low',
    )
    .sort((a, b) => b.priorityScore - a.priorityScore)

  // Two insights can land on the same recommendation - "re-date the deal or
  // take it out of the forecast" fits every overdue deal. The action is listed
  // once, against the highest-priority signal that produced it, rather than
  // repeated down the page.
  const seen = new Set<string>()
  for (const insight of live) {
    if (seen.has(insight.recommendation)) continue
    seen.add(insight.recommendation)
    items.push({ text: insight.recommendation, detail: insight.title })
  }

  if (items.length === 0 && forecast.path.required > 0) {
    items.push({ text: forecast.path.summary, detail: null })
  }

  if (items.length === 0) {
    items.push({
      text: 'No action is outstanding: nothing in the current data is above the medium severity band.',
      detail: null,
    })
  }

  return items
}
