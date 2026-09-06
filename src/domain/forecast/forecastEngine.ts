import type { Activity, Opportunity, Owner } from '@/domain/commerce'
import { openOpportunities, pipelineValue, weightedPipelineValue } from '@/domain/metrics/primitives'
import type { Period } from '@/domain/metrics/periods'
import type { HealthBand } from '@/domain/intelligence/opportunityScoring'
import { FORECAST_CONFIG as C } from './forecastConfig'
import { computeContributions, totalContribution } from './forecastCalculator'
import { assessConfidence } from './forecastConfidenceEngine'
import { assessDataQuality } from './forecastDataQuality'
import { buildScenarios } from './forecastScenarioEngine'
import { buildSensitivity } from './forecastSensitivity'
import { buildTimeline } from './forecastTimeline'
import { assessGap, buildPath, targetProbability } from './targetProjectionEngine'
import type {
  ForecastContribution,
  ForecastDriver,
  ForecastReport,
  ForecastRisk,
  RepForecast,
  WaterfallStep,
} from './types'

/**
 * The forecast engine.
 *
 *   commercial data -> deterministic model -> ForecastReport -> UI
 *
 * One entry point, one result, consumed by the Forecast page, the Dashboard KPI
 * and the Intelligence rules alike. Because they all read the same structure,
 * the Dashboard cannot say 448k while the Forecast page says 462k.
 *
 * Nothing here is random, nothing is fetched, and the same commercial data
 * always produces the same report.
 */
export interface ForecastInput {
  /** Opportunities already scoped to the owner filter in force. */
  opportunities: Opportunity[]
  owners: Owner[]
  period: Period
  now: Date
  target: number
  revenue: number
  remainingToTarget: number
  coverage: number | null
  pace: number | null
  winRate: number | null
  activitiesFor: (opportunityId: string) => Activity[]
  /** Per-rep target, so the rep table measures against the same commitments. */
  targetFor: (ownerId: string) => number
  /**
   * The workspace's own currency formatter. The engine writes sentences with
   * figures in them, and a figure formatted anywhere but the shared formatter
   * would be the one number on the page in the wrong locale.
   */
  currency: (value: number) => string
}

export function runForecast(input: ForecastInput): ForecastReport {
  const { opportunities, period, now, target, revenue } = input

  const open = openOpportunities(opportunities)
  const averageOpenValue =
    open.length > 0 ? open.reduce((total, o) => total + o.value, 0) / open.length : 0

  const contributions = computeContributions(opportunities, {
    now,
    period,
    activitiesFor: input.activitiesFor,
    averageOpenValue,
  })

  const openForecast = totalContribution(contributions)
  const scenarios = buildScenarios(contributions, revenue, target)
  const base = scenarios.base

  const quality = assessDataQuality(open, input.activitiesFor)

  const confidence = assessConfidence({
    closedRevenue: revenue,
    baseForecast: base.value,
    contributions,
    quality,
    coverage: input.coverage,
  })

  const probability = targetProbability({
    baseForecast: base.value,
    target,
    revenue,
    remainingToTarget: input.remainingToTarget,
    coverage: input.coverage,
    pace: input.pace,
    winRate: input.winRate,
    historicalWinRate: input.winRate,
    contributions,
    openForecast,
  })

  const gapDetail = assessGap(base.value, target, confidence.score)
  const path = buildPath(contributions, gapDetail)
  const timeline = buildTimeline(contributions, period, now)
  const sensitivity = buildSensitivity(contributions, revenue, target)
  const risk = buildRisk(contributions, openForecast)
  const bandShares = computeBandShares(contributions, openForecast)
  const waterfall = buildWaterfall(revenue, contributions, base.value, target, input.currency)
  const reps = buildRepForecasts(input, contributions, confidence.score)
  const drivers = buildDrivers({
    revenue,
    base: base.value,
    target,
    contributions,
    openForecast,
    timeline,
    risk,
    confidence: confidence.score,
    coverage: input.coverage,
    quality,
    currency: input.currency,
  })

  return {
    // Fields the rest of the product already consumed, now better calculated.
    value: base.value,
    closedRevenue: revenue,
    expectedFromPipeline: base.fromPipeline,
    attainment: base.attainment,
    gap: base.gap,
    contributors: contributions.map((entry) => entry.opportunity),

    target,
    scenarios,
    scenarioList: [scenarios.worst, scenarios.base, scenarios.best],
    contributions,
    gapDetail,
    confidence,
    probability,
    waterfall,
    timeline,
    path,
    reps,
    quality,
    risk,
    sensitivity,
    drivers,
    bandShares,
    methodology:
      'Every open deal due before the period ends contributes value multiplied by its probability, a health factor and a timing factor. Closed revenue is added unadjusted. Worst and best cases re-run the same model under stated assumptions rather than applying a percentage to the base.',
  }
}

// ---------------------------------------------------------------------------
// Risk: read from the same health assessment the Intelligence engine uses
// ---------------------------------------------------------------------------

function buildRisk(
  contributions: ForecastContribution[],
  openForecast: number,
): ForecastRisk {
  const entries = contributions
    .filter(
      (entry) => entry.health.band === 'at-risk' || entry.health.band === 'critical',
    )
    .map((entry) => ({
      contribution: entry,
      atRisk: entry.contribution,
      reason: entry.health.reason,
      recommendation:
        entry.health.daysToClose < 0
          ? 'Re-date the deal or take it out of the forecast.'
          : entry.health.inactiveDays >= 12
            ? 'Make contact and record the outcome before the close date.'
            : 'Confirm the deal is still on track for the date in the forecast.',
    }))
    .sort((a, b) => b.atRisk - a.atRisk)

  const total = entries.reduce((sum, entry) => sum + entry.atRisk, 0)

  return {
    total,
    entries,
    share: openForecast > 0 ? total / openForecast : 0,
    methodology:
      'Revenue already inside the forecast that comes from deals in the At risk or Critical health band. It uses the same health assessment as Commercial Intelligence, so the two screens can never disagree about which deals are exposed.',
  }
}

function computeBandShares(
  contributions: ForecastContribution[],
  openForecast: number,
): Record<HealthBand, number> {
  const bands: HealthBand[] = ['healthy', 'attention', 'at-risk', 'critical']
  const shares = {} as Record<HealthBand, number>
  for (const band of bands) {
    const value = contributions
      .filter((entry) => entry.health.band === band)
      .reduce((total, entry) => total + entry.contribution, 0)
    shares[band] = openForecast > 0 ? value / openForecast : 0
  }
  return shares
}

// ---------------------------------------------------------------------------
// Waterfall: how the forecast is built, step by step
// ---------------------------------------------------------------------------

function buildWaterfall(
  closedRevenue: number,
  contributions: ForecastContribution[],
  baseForecast: number,
  target: number,
  currency: (value: number) => string,
): WaterfallStep[] {
  const high = contributions.filter(
    (entry) => entry.probability >= C.highConfidenceProbability,
  )
  const medium = contributions.filter(
    (entry) =>
      entry.probability < C.highConfidenceProbability &&
      entry.probability >= C.lowConfidenceProbability,
  )
  const low = contributions.filter(
    (entry) => entry.probability < C.lowConfidenceProbability,
  )

  // Face weighted value before health and timing, so the adjustment step shows
  // exactly what the extra two factors removed.
  const weighted = (entries: ForecastContribution[]) =>
    entries.reduce((total, entry) => total + entry.value * entry.probability, 0)
  const adjusted = (entries: ForecastContribution[]) =>
    entries.reduce((total, entry) => total + entry.contribution, 0)

  const highWeighted = weighted(high)
  const mediumWeighted = weighted(medium)
  const lowWeighted = weighted(low)
  const adjustment =
    adjusted(contributions) - (highWeighted + mediumWeighted + lowWeighted)

  const steps: WaterfallStep[] = []
  let running = 0

  const add = (
    key: string,
    label: string,
    delta: number,
    tone: WaterfallStep['tone'],
    detail: string,
  ) => {
    running += delta
    steps.push({ key, label, delta, total: running, tone, detail })
  }

  add(
    'closed',
    'Closed revenue',
    closedRevenue,
    'base',
    'Deals already won in this period. Not a projection.',
  )
  add(
    'high',
    'High-confidence pipeline',
    highWeighted,
    'positive',
    `${high.length} open ${high.length === 1 ? 'deal' : 'deals'} at ${Math.round(C.highConfidenceProbability * 100)}% or above, at value multiplied by probability.`,
  )
  add(
    'medium',
    'Medium-confidence pipeline',
    mediumWeighted,
    'positive',
    `${medium.length} open ${medium.length === 1 ? 'deal' : 'deals'} between ${Math.round(C.lowConfidenceProbability * 100)}% and ${Math.round(C.highConfidenceProbability * 100)}%.`,
  )
  if (low.length > 0) {
    add(
      'low',
      'Low-confidence pipeline',
      lowWeighted,
      'positive',
      `${low.length} open ${low.length === 1 ? 'deal' : 'deals'} below ${Math.round(C.lowConfidenceProbability * 100)}%.`,
    )
  }
  add(
    'adjustment',
    'Health and timing adjustment',
    adjustment,
    'negative',
    'What the health and timing factors remove from the plain weighted value.',
  )

  steps.push({
    key: 'forecast',
    label: 'Base forecast',
    delta: 0,
    total: baseForecast,
    tone: 'result',
    detail:
      target > 0
        ? `${Math.round((baseForecast / target) * 100)}% of the ${currency(target)} target.`
        : 'No target set for this period.',
  })

  return steps
}

// ---------------------------------------------------------------------------
// Per representative
// ---------------------------------------------------------------------------

function buildRepForecasts(
  input: ForecastInput,
  contributions: ForecastContribution[],
  companyConfidence: number,
): RepForecast[] {
  const { owners, opportunities, period } = input

  return owners
    .map((owner) => {
      const theirs = opportunities.filter((o) => o.ownerId === owner.id)
      const open = openOpportunities(theirs)
      const won = theirs.filter(
        (o) =>
          o.stage === 'won' &&
          o.closedAt !== null &&
          new Date(o.closedAt) >= period.start &&
          new Date(o.closedAt) <= period.end,
      )
      const revenue = won.reduce((total, o) => total + o.value, 0)
      const mine = contributions.filter((entry) => entry.opportunity.ownerId === owner.id)
      const fromPipeline = totalContribution(mine)
      const forecast = revenue + fromPipeline
      const repTarget = input.targetFor(owner.id)

      // Confidence on this rep's own mix, weighted the way the company model
      // weights the same three things. Banked revenue is the strongest signal
      // but not the only one: a rep with nothing yet booked and a pipeline of
      // healthy, likely deals is not a low-confidence forecast, and an earlier
      // version that leaned almost entirely on banked revenue said they were.
      const banked = forecast > 0 ? revenue / forecast : 0
      const shareOf = (predicate: (entry: ForecastContribution) => boolean) =>
        fromPipeline > 0
          ? mine.filter(predicate).reduce((total, entry) => total + entry.contribution, 0) /
            fromPipeline
          : 0

      const healthy = shareOf((entry) => entry.health.band === 'healthy')
      const likely = shareOf(
        (entry) => entry.probability >= C.highConfidenceProbability,
      )

      const confidence =
        mine.length === 0 && revenue === 0
          ? companyConfidence
          : Math.round(
              Math.max(0, Math.min(100, banked * 35 + healthy * 40 + likely * 25)),
            )

      const gap = forecast - repTarget
      const ratio = repTarget > 0 ? gap / repTarget : 0

      const state: RepForecast['state'] =
        repTarget <= 0
          ? 'on-track'
          : ratio >= 0
            ? 'above-target'
            : Math.abs(ratio) <= C.gap.near
              ? 'on-track'
              : Math.abs(ratio) >= C.gap.critical
                ? 'critical'
                : 'at-risk'

      return {
        ownerId: owner.id,
        name: owner.name,
        revenue,
        target: repTarget,
        pipeline: pipelineValue(open),
        weightedPipeline: weightedPipelineValue(open),
        forecast,
        fromPipeline,
        attainment: repTarget > 0 ? forecast / repTarget : null,
        gap,
        confidence,
        state,
        dealCount: mine.length,
      }
    })
    .sort((a, b) => b.forecast - a.forecast)
    .filter((rep) => rep.forecast > 0 || rep.pipeline > 0 || rep.target > 0)
}

// ---------------------------------------------------------------------------
// Why this forecast
// ---------------------------------------------------------------------------

interface DriverInput {
  revenue: number
  base: number
  target: number
  contributions: ForecastContribution[]
  openForecast: number
  timeline: ForecastReport['timeline']
  risk: ForecastRisk
  confidence: number
  coverage: number | null
  quality: ForecastReport['quality']
  currency: (value: number) => string
}

/**
 * The drivers behind the number, positive and negative.
 *
 * Every line is a fact with a figure attached, computed above. None of it is
 * commentary: if a driver appears, a calculation produced it.
 */
function buildDrivers(input: DriverInput): ForecastDriver[] {
  const drivers: ForecastDriver[] = []
  const { revenue, base, target, contributions, openForecast, risk, timeline } = input
  const format = input.currency

  if (revenue > 0) {
    drivers.push({
      tone: 'positive',
      amount: revenue,
      text: `${format(revenue)} is already closed and needs nothing further to happen.`,
    })
  }

  const healthyDeals = contributions.filter((entry) => entry.health.band === 'healthy')
  if (healthyDeals.length > 0) {
    drivers.push({
      tone: 'positive',
      amount: totalContribution(healthyDeals),
      text: `${healthyDeals.length} healthy ${healthyDeals.length === 1 ? 'opportunity is' : 'opportunities are'} due before the period ends, worth ${format(totalContribution(healthyDeals))} of the forecast.`,
    })
  }

  if (input.coverage !== null && input.coverage >= 3) {
    drivers.push({
      tone: 'positive',
      amount: null,
      text: `Open pipeline covers what is left of the target ${input.coverage.toFixed(1)} times over.`,
    })
  }

  if (target > 0 && base >= target) {
    drivers.push({
      tone: 'positive',
      amount: base - target,
      text: `The base case lands ${format(base - target)} above target.`,
    })
  }

  // --- Negative ------------------------------------------------------------
  if (risk.total > 0) {
    drivers.push({
      tone: 'negative',
      amount: risk.total,
      text: `${format(risk.total)} of the forecast comes from ${risk.entries.length} ${risk.entries.length === 1 ? 'deal' : 'deals'} in a poor health band.`,
    })
  }

  const top = [...contributions]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, C.concentrationDeals)
  const concentration =
    openForecast > 0
      ? top.reduce((total, entry) => total + entry.contribution, 0) / openForecast
      : 0
  if (concentration >= C.concentrationThreshold && top.length > 0) {
    drivers.push({
      tone: 'negative',
      amount: null,
      text: `${Math.round(concentration * 100)}% of the projected pipeline revenue depends on ${top.length} ${top.length === 1 ? 'opportunity' : 'opportunities'} closing.`,
    })
  }

  if (timeline.backLoaded) {
    drivers.push({
      tone: 'negative',
      amount: null,
      text: `${Math.round(timeline.lateShare * 100)}% of forecast revenue is expected in the final ${timeline.lateDays} days of the period.`,
    })
  }

  if (target > 0 && base < target) {
    drivers.push({
      tone: 'negative',
      amount: target - base,
      text: `The base case lands ${format(target - base)} short of target.`,
    })
  }

  if (input.quality.score < 90 && input.quality.issues.length > 0) {
    drivers.push({
      tone: 'negative',
      amount: null,
      text: `Data quality is ${input.quality.score}%: ${input.quality.issues[0].label}.`,
    })
  }

  return drivers
}
