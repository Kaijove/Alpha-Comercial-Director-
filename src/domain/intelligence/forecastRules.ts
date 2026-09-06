import { FORECAST_CONFIG } from '@/domain/forecast/forecastConfig'
import type { IntelligenceContext } from './context'
import type { InsightDraft } from './types'

/**
 * Forecast signals inside Commercial Intelligence.
 *
 * These rules do not recompute anything. The forecast engine has already
 * produced a structured report on `metrics.forecast`; this file only decides
 * which parts of it are worth interrupting a director about, and expresses them
 * in the same `Insight` shape every other rule uses.
 *
 * That separation is the point: one engine owns the model, Intelligence owns
 * what deserves attention, and the two can never disagree about the number.
 */
export function forecastRules(context: IntelligenceContext): InsightDraft[] {
  const { metrics, fmt } = context
  const forecast = metrics.forecast
  const drafts: InsightDraft[] = []

  const period = metrics.period
  const createdAt = period.start.toISOString()

  // --- The forecast does not reach the commitment --------------------------
  if (
    metrics.target > 0 &&
    forecast.gapDetail.additionalRequired > 0 &&
    forecast.gapDetail.state !== 'on-track'
  ) {
    const { gapDetail, path } = forecast
    drafts.push({
      id: 'forecast.gap',
      type: 'risk',
      category: 'forecast',
      title: `Forecast lands ${fmt.currency(gapDetail.additionalRequired)} short of target`,
      description: `The base case projects ${fmt.currency(forecast.value)} against a ${fmt.currency(metrics.target)} commitment, ${forecast.attainment !== null ? fmt.percent(forecast.attainment, 1) : '—'} of target.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Period forecast',
      impact: gapDetail.additionalRequired,
      reason: gapDetail.summary,
      triggers: [
        `Base forecast ${fmt.currency(forecast.value)} against a ${fmt.currency(metrics.target)} target`,
        `${fmt.currency(forecast.closedRevenue)} already closed, ${fmt.currency(forecast.expectedFromPipeline)} expected from open deals`,
        `Probability of reaching target scored at ${forecast.probability.score}/100`,
        ...(metrics.pace !== null && metrics.pace < 0.9
          ? [
              `Revenue is ${fmt.currency(metrics.expectedByNow - metrics.revenue)} behind the pace needed by today`,
            ]
          : []),
      ],
      evidence: [
        { label: 'Worst case', value: fmt.currency(forecast.scenarios.worst.value) },
        { label: 'Base case', value: fmt.currency(forecast.scenarios.base.value) },
        { label: 'Best case', value: fmt.currency(forecast.scenarios.best.value) },
        { label: 'Target', value: fmt.currency(metrics.target) },
        { label: 'Still required', value: fmt.currency(gapDetail.additionalRequired) },
      ],
      recommendation: path.reachable
        ? path.summary
        : 'The gap is larger than the open pipeline can cover; new opportunities matter more than faster closing.',
      action: { label: 'View forecast', to: '/forecast' },
      createdAt,
      confidence: 0.9,
      daysUntil: period.remainingDays,
    })
  }

  // --- The forecast reaches target, but on assumptions that do not hold ----
  if (
    metrics.target > 0 &&
    forecast.gap >= 0 &&
    forecast.confidence.score < FORECAST_CONFIG.confidence.moderate
  ) {
    drafts.push({
      id: 'forecast.confidence',
      type: 'risk',
      category: 'forecast',
      title: `Forecast clears target but confidence is only ${forecast.confidence.score}/100`,
      description: `The base case lands ${fmt.currency(forecast.gap)} above target, but the make-up of that number does not support it.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Period forecast',
      impact: forecast.expectedFromPipeline,
      reason: forecast.confidence.summary,
      triggers: forecast.confidence.factors
        .slice()
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map((factor) => `${factor.label}: ${factor.detail}`),
      evidence: [
        { label: 'Base forecast', value: fmt.currency(forecast.value) },
        { label: 'Already closed', value: fmt.currency(forecast.closedRevenue) },
        { label: 'From open deals', value: fmt.currency(forecast.expectedFromPipeline) },
        { label: 'Confidence', value: `${forecast.confidence.score}/100` },
      ],
      recommendation:
        'Treat the headline number as provisional until more of it is banked or the exposed deals move.',
      action: { label: 'View forecast', to: '/forecast' },
      createdAt,
      confidence: 0.85,
      daysUntil: period.remainingDays,
    })
  }

  // --- The period leans on its final days ----------------------------------
  if (forecast.timeline.backLoaded) {
    const { timeline } = forecast
    drafts.push({
      id: 'forecast.back-loaded',
      type: 'risk',
      category: 'forecast',
      title: `${fmt.percent(timeline.lateShare, 0)} of forecast revenue lands in the final ${timeline.lateDays} days`,
      description: timeline.summary,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Closing timeline',
      impact: forecast.expectedFromPipeline * timeline.lateShare,
      reason:
        'A deal that slips in the last week of a period does not slip by a week, it slips into the next period.',
      triggers: timeline.buckets.map(
        (bucket) =>
          `${bucket.label}: ${fmt.currency(bucket.value)} across ${bucket.dealCount} ${bucket.dealCount === 1 ? 'deal' : 'deals'}`,
      ),
      evidence: timeline.buckets.map((bucket) => ({
        label: bucket.label,
        value: fmt.currency(bucket.value),
      })),
      recommendation:
        'Pull what can be pulled forward, and confirm the dates on everything that cannot.',
      action: { label: 'View forecast', to: '/forecast' },
      createdAt,
      confidence: 0.8,
      daysUntil: period.remainingDays,
    })
  }

  // --- Forecast data quality ------------------------------------------------
  if (forecast.quality.score < 80 && forecast.quality.issues.length > 0) {
    drafts.push({
      id: 'forecast.data-quality',
      type: 'performance',
      category: 'forecast',
      title: `Forecast data quality is ${forecast.quality.score}%`,
      description: forecast.quality.summary,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Open pipeline',
      impact: null,
      reason:
        'Every missing field is a deal the model has to guess about, and the forecast inherits the guess.',
      triggers: forecast.quality.issues.map((issue) => issue.label),
      evidence: forecast.quality.issues.map((issue) => ({
        label: issue.label,
        value: `-${issue.penalty}`,
      })),
      recommendation: 'Fill in the missing fields on the affected opportunities.',
      action: { label: 'View pipeline', to: '/pipeline' },
      createdAt,
      confidence: 0.95,
      daysUntil: null,
    })
  }

  // --- Good news worth protecting ------------------------------------------
  if (
    metrics.target > 0 &&
    forecast.gap > 0 &&
    forecast.confidence.score >= FORECAST_CONFIG.confidence.high
  ) {
    drafts.push({
      id: 'forecast.above-target',
      type: 'opportunity',
      category: 'forecast',
      title: `Forecast lands ${fmt.currency(forecast.gap)} above target`,
      description: `${fmt.currency(forecast.value)} projected against ${fmt.currency(metrics.target)}, at ${forecast.confidence.score}/100 confidence.`,
      entityType: 'pipeline',
      entityId: null,
      entityName: 'Period forecast',
      impact: forecast.gap,
      reason:
        'A comfortable period is the cheapest time to build the pipeline the next one will need.',
      triggers: [
        `Base forecast ${fmt.currency(forecast.value)} against a ${fmt.currency(metrics.target)} target`,
        `Confidence ${forecast.confidence.score}/100`,
        `Probability of target ${forecast.probability.score}/100`,
      ],
      evidence: [
        { label: 'Base forecast', value: fmt.currency(forecast.value) },
        { label: 'Target', value: fmt.currency(metrics.target) },
        { label: 'Worst case', value: fmt.currency(forecast.scenarios.worst.value) },
      ],
      recommendation:
        'Protect what is committed and use the headroom to open next period rather than pulling deals forward.',
      action: { label: 'View forecast', to: '/forecast' },
      createdAt,
      confidence: 0.8,
      daysUntil: null,
      positive: true,
    })
  }

  return drafts
}
