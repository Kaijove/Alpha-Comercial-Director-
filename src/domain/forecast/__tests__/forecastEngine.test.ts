import { describe, expect, it } from 'vitest'
import { generateCommercialData } from '@/data/seed/generateCommercialData'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { computeContributions, totalContribution } from '../forecastCalculator'
import { buildScenarios } from '../forecastScenarioEngine'
import { assessConfidence } from '../forecastConfidenceEngine'
import { assessDataQuality } from '../forecastDataQuality'
import { buildSensitivity, simulate } from '../forecastSensitivity'
import { assessGap, buildPath, targetProbability } from '../targetProjectionEngine'
import { assessAccuracy } from '../forecastAccuracy'
import { FORECAST_CONFIG as C } from '../forecastConfig'
import { DEFAULT_SIMULATOR, type ForecastSnapshot } from '../types'
import {
  NOW,
  activities,
  makeOpportunity,
  makeWorkspace,
} from '@/domain/intelligence/__tests__/factories'

/**
 * The forecast is the number a director repeats in a board meeting, so these
 * tests are about the model being defensible: same input, same output; the
 * scenarios genuinely ordered; nothing unbounded; and the parts summing to the
 * whole.
 */
const workspace = makeWorkspace()
const dataset = generateCommercialData(workspace, NOW)
const period = resolvePeriod('mtd', NOW)
const metrics = computeCommercialMetrics(dataset, workspace, period, null)
const forecast = metrics.forecast

const inPeriod = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000).toISOString()

const context = {
  now: NOW,
  period,
  activitiesFor: () => activities(3),
  averageOpenValue: 100_000,
}

describe('base forecast', () => {
  it('is the same for the same commercial data', () => {
    const again = computeCommercialMetrics(dataset, workspace, period, null).forecast
    expect(again.value).toBe(forecast.value)
    expect(again.confidence.score).toBe(forecast.confidence.score)
    expect(again.probability.score).toBe(forecast.probability.score)
    expect(again.contributions.map((c) => c.contribution)).toEqual(
      forecast.contributions.map((c) => c.contribution),
    )
  })

  it('is closed revenue plus the open contributions, and nothing else', () => {
    expect(forecast.value).toBeCloseTo(
      forecast.closedRevenue + totalContribution(forecast.contributions),
      6,
    )
    expect(forecast.expectedFromPipeline).toBeCloseTo(
      totalContribution(forecast.contributions),
      6,
    )
  })

  it('counts closed revenue without adjusting it', () => {
    expect(forecast.closedRevenue).toBe(metrics.revenue)
  })

  it('never counts a deal due after the period ends', () => {
    for (const entry of forecast.contributions) {
      expect(new Date(entry.opportunity.expectedCloseDate).getTime()).toBeLessThanOrEqual(
        period.end.getTime(),
      )
      expect(entry.opportunity.stage).not.toBe('won')
      expect(entry.opportunity.stage).not.toBe('lost')
    }
  })
})

describe('forecast contribution', () => {
  it('is value x probability x health x timing, not value x probability', () => {
    // Due in the last days of the period, and silent for weeks: both factors
    // should bite. The tight window is measured against the period end, not
    // against today, so a deal due soon but early in the period is not tight.
    const opportunity = makeOpportunity({
      value: 100_000,
      probability: 0.6,
      expectedCloseDate: inPeriod(14),
      lastActivityAt: inPeriod(-40),
      stageHistory: [{ stage: 'lead', at: '2025-01-01T00:00:00.000Z' }],
    })
    const [entry] = computeContributions([opportunity], context)

    expect(entry.healthFactor).toBeLessThan(1)
    expect(entry.timingFactor).toBeLessThan(1)
    expect(entry.contribution).toBeCloseTo(
      100_000 * 0.6 * entry.healthFactor * entry.timingFactor,
      6,
    )
    expect(entry.contribution).toBeLessThan(100_000 * 0.6)
  })

  it('leaves a healthy, comfortably dated deal at its weighted value', () => {
    const opportunity = makeOpportunity({
      value: 80_000,
      probability: 0.5,
      expectedCloseDate: inPeriod(2),
      lastActivityAt: inPeriod(-1),
    })
    // The period runs to month end; a deal due in two days is inside it.
    const [entry] = computeContributions([opportunity], {
      ...context,
      period: { ...period, end: new Date(NOW.getTime() + 60 * 86_400_000) },
    })
    expect(entry.healthFactor).toBe(1)
    expect(entry.timingFactor).toBe(1)
    expect(entry.contribution).toBe(40_000)
  })

  it('sums to the reported pipeline contribution', () => {
    const sum = forecast.contributions.reduce((total, entry) => total + entry.contribution, 0)
    expect(sum).toBeCloseTo(forecast.expectedFromPipeline, 6)
  })

  it('never contributes more than the deal is worth', () => {
    for (const entry of forecast.contributions) {
      expect(entry.contribution).toBeLessThanOrEqual(entry.value)
      expect(entry.contribution).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('scenarios', () => {
  it('orders worst below base below best', () => {
    expect(forecast.scenarios.worst.value).toBeLessThanOrEqual(forecast.scenarios.base.value)
    expect(forecast.scenarios.base.value).toBeLessThanOrEqual(forecast.scenarios.best.value)
  })

  it('shares the same closed revenue: money already won cannot un-win', () => {
    for (const scenario of forecast.scenarioList) {
      expect(scenario.value - scenario.fromPipeline).toBeCloseTo(forecast.closedRevenue, 6)
    }
  })

  it('is not a percentage of the base case', () => {
    const contributions = computeContributions(
      [
        makeOpportunity({ id: 'likely', probability: 0.9, expectedCloseDate: inPeriod(10) }),
        makeOpportunity({ id: 'unlikely', probability: 0.2, expectedCloseDate: inPeriod(10) }),
      ],
      context,
    )
    const scenarios = buildScenarios(contributions, 0, 500_000)
    // The worst case drops the unlikely deal entirely rather than scaling both.
    expect(scenarios.worst.dealCount).toBe(1)
    expect(scenarios.base.dealCount).toBe(2)
  })

  it('never models a deal above the best-case ceiling', () => {
    for (const entry of forecast.contributions) {
      expect(entry.bestCaseContribution).toBeLessThanOrEqual(
        entry.value * C.bestCaseCeiling + 0.001,
      )
    }
  })

  it('only lets likely, healthy deals into the worst case', () => {
    for (const entry of forecast.contributions.filter((e) => e.inWorstCase)) {
      expect(entry.probability).toBeGreaterThanOrEqual(C.worstCaseProbability)
      expect(['healthy', 'attention']).toContain(entry.health.band)
    }
  })
})

describe('forecast gap', () => {
  it('is the base forecast minus the target', () => {
    expect(forecast.gapDetail.amount).toBeCloseTo(forecast.value - metrics.target, 6)
    expect(forecast.gap).toBeCloseTo(forecast.value - metrics.target, 6)
  })

  it('reports the shortfall as additional revenue required, never a negative', () => {
    expect(forecast.gapDetail.additionalRequired).toBeGreaterThanOrEqual(0)
    if (forecast.gapDetail.amount >= 0) {
      expect(forecast.gapDetail.additionalRequired).toBe(0)
    } else {
      expect(forecast.gapDetail.additionalRequired).toBeCloseTo(
        Math.abs(forecast.gapDetail.amount),
        6,
      )
    }
  })

  it('does not call a forecast on target "on track" when confidence is low', () => {
    const confident = assessGap(500_000, 500_000, 80)
    const shaky = assessGap(500_000, 500_000, 20)
    expect(confident.state).toBe('above-target')
    expect(shaky.state).toBe('at-risk')
  })

  it('calls a large shortfall critical', () => {
    expect(assessGap(400_000, 500_000, 80).state).toBe('critical')
  })
})

describe('target attainment', () => {
  it('is the forecast over the target', () => {
    expect(forecast.attainment).toBeCloseTo(forecast.value / metrics.target, 6)
    for (const scenario of forecast.scenarioList) {
      expect(scenario.attainment).toBeCloseTo(scenario.value / metrics.target, 6)
    }
  })

  it('is null rather than infinite when no target is set', () => {
    const scenarios = buildScenarios([], 100_000, 0)
    expect(scenarios.base.attainment).toBeNull()
  })
})

describe('probability of reaching target', () => {
  it('stays between 0 and 100', () => {
    expect(forecast.probability.score).toBeGreaterThanOrEqual(0)
    expect(forecast.probability.score).toBeLessThanOrEqual(100)
  })

  it('is higher when the forecast clears target than when it falls short', () => {
    const base = {
      revenue: 100_000,
      remainingToTarget: 400_000,
      coverage: 3,
      pace: 1,
      winRate: 0.35,
      historicalWinRate: 0.35,
      contributions: forecast.contributions,
      openForecast: forecast.expectedFromPipeline,
      target: 500_000,
    }
    const ahead = targetProbability({ ...base, baseForecast: 600_000 })
    const behind = targetProbability({ ...base, baseForecast: 350_000 })
    expect(ahead.score).toBeGreaterThan(behind.score)
  })

  it('weights its factors to 1', () => {
    const total = forecast.probability.factors.reduce(
      (sum, factor) => sum + factor.weight,
      0,
    )
    expect(total).toBeCloseTo(1, 6)
  })
})

describe('forecast confidence', () => {
  const quality = assessDataQuality(
    dataset.opportunities.filter((o) => o.stage !== 'won' && o.stage !== 'lost'),
    () => activities(2),
  )

  it('stays between 0 and 100 and weights its factors to 1', () => {
    expect(forecast.confidence.score).toBeGreaterThanOrEqual(0)
    expect(forecast.confidence.score).toBeLessThanOrEqual(100)
    expect(
      forecast.confidence.factors.reduce((sum, factor) => sum + factor.weight, 0),
    ).toBeCloseTo(1, 6)
  })

  it('rises as more of the forecast is already banked', () => {
    const shared = { contributions: forecast.contributions, quality, coverage: 3 }
    const mostlyBanked = assessConfidence({
      ...shared,
      closedRevenue: 450_000,
      baseForecast: 500_000,
    })
    const mostlyProjected = assessConfidence({
      ...shared,
      closedRevenue: 20_000,
      baseForecast: 500_000,
    })
    expect(mostlyBanked.score).toBeGreaterThan(mostlyProjected.score)
  })

  it('falls when the data behind it is incomplete', () => {
    const shared = {
      closedRevenue: 100_000,
      baseForecast: 500_000,
      contributions: forecast.contributions,
      coverage: 3,
    }
    const clean = assessConfidence({ ...shared, quality })
    const dirty = assessConfidence({
      ...shared,
      quality: { ...quality, score: 30 },
    })
    expect(dirty.score).toBeLessThan(clean.score)
  })

  it('bands the score into high, moderate and low', () => {
    expect(forecast.confidence.level).toBe(
      forecast.confidence.score >= C.confidence.high
        ? 'high'
        : forecast.confidence.score >= C.confidence.moderate
          ? 'moderate'
          : 'low',
    )
  })
})

describe('data quality', () => {
  it('is 100 when every field the model reads is present', () => {
    const quality = assessDataQuality([makeOpportunity()], () => activities(2))
    expect(quality.score).toBe(100)
    expect(quality.issues).toHaveLength(0)
  })

  it('falls, and says why, when fields are missing', () => {
    const quality = assessDataQuality(
      [makeOpportunity({ probability: 0, ownerId: '' })],
      () => [],
    )
    expect(quality.score).toBeLessThan(100)
    expect(quality.issues.length).toBeGreaterThan(0)
  })

  it('never lets a single check zero the score', () => {
    const broken = Array.from({ length: 40 }, (_, i) =>
      makeOpportunity({ id: `o${i}`, probability: 0 }),
    )
    const quality = assessDataQuality(broken, () => activities(2))
    expect(quality.score).toBeGreaterThanOrEqual(100 - C.quality.maxPenaltyPerCheck)
  })
})

describe('pipeline exclusion sensitivity', () => {
  const sensitivity = buildSensitivity(
    forecast.contributions,
    forecast.closedRevenue,
    metrics.target,
  )

  it('never raises the forecast by removing deals', () => {
    const all = sensitivity.pipeline.find((point) => point.key === 'pipeline:all')!
    for (const point of sensitivity.pipeline) {
      expect(point.value).toBeLessThanOrEqual(all.value + 0.001)
    }
  })

  it('narrows monotonically as the filter tightens', () => {
    const value = (key: string) =>
      sensitivity.pipeline.find((point) => point.key === key)!.value
    expect(value('pipeline:no-risk')).toBeLessThanOrEqual(value('pipeline:all'))
    expect(value('pipeline:high-only')).toBeLessThanOrEqual(value('pipeline:no-risk'))
  })

  it('moves the forecast up when conversion improves and down when it falls', () => {
    const [down, current, up] = sensitivity.conversion
    expect(down.value).toBeLessThanOrEqual(current.value)
    expect(up.value).toBeGreaterThanOrEqual(current.value)
    expect(current.value).toBeCloseTo(forecast.value, 6)
  })
})

describe('simulator', () => {
  it('reproduces the real forecast when nothing has been moved', () => {
    const result = simulate(
      forecast.contributions,
      forecast.closedRevenue,
      metrics.target,
      forecast.probability.score,
      DEFAULT_SIMULATOR,
    )
    expect(result.value).toBeCloseTo(forecast.value, 6)
    expect(result.probability).toBe(forecast.probability.score)
    expect(result.isDefault).toBe(true)
  })

  it('never mutates the opportunities it reads', () => {
    const before = forecast.contributions.map((entry) => ({
      value: entry.opportunity.value,
      probability: entry.opportunity.probability,
      contribution: entry.contribution,
    }))
    simulate(forecast.contributions, forecast.closedRevenue, metrics.target, 50, {
      winRateFactor: 1.5,
      dealSizeFactor: 1.5,
      extraDeals: 5,
    })
    expect(
      forecast.contributions.map((entry) => ({
        value: entry.opportunity.value,
        probability: entry.opportunity.probability,
        contribution: entry.contribution,
      })),
    ).toEqual(before)
  })

  it('keeps the simulated probability inside 0-100', () => {
    for (const factor of [0.5, 1, 1.5]) {
      const result = simulate(
        forecast.contributions,
        forecast.closedRevenue,
        metrics.target,
        forecast.probability.score,
        { winRateFactor: factor, dealSizeFactor: factor, extraDeals: 10 },
      )
      expect(result.probability).toBeGreaterThanOrEqual(0)
      expect(result.probability).toBeLessThanOrEqual(100)
    }
  })

  it('never models a probability above certainty', () => {
    const contributions = computeContributions(
      [makeOpportunity({ value: 100_000, probability: 0.9, expectedCloseDate: inPeriod(10) })],
      context,
    )
    const result = simulate(contributions, 0, 500_000, 50, {
      ...DEFAULT_SIMULATOR,
      winRateFactor: 1.5,
    })
    expect(result.value).toBeLessThanOrEqual(100_000)
  })
})

describe('path to target', () => {
  it('asks for nothing when the forecast already covers the target', () => {
    const path = buildPath(forecast.contributions, assessGap(600_000, 500_000, 80))
    expect(path.required).toBe(0)
    expect(path.deals).toHaveLength(0)
    expect(path.reachable).toBe(true)
  })

  it('chooses enough deals to cover the gap at full value', () => {
    const gap = assessGap(400_000, 500_000, 60)
    const path = buildPath(forecast.contributions, gap)
    if (path.reachable) {
      const covered = path.deals
        .slice(0, path.needed)
        .reduce((total, entry) => total + entry.value, 0)
      expect(covered).toBeGreaterThanOrEqual(gap.additionalRequired)
    }
  })

  it('says so rather than pretending when the pipeline cannot cover the gap', () => {
    const path = buildPath([], assessGap(0, 500_000, 40))
    expect(path.reachable).toBe(false)
    expect(path.needed).toBe(0)
  })
})

describe('forecast by representative', () => {
  it('sums to the company forecast', () => {
    const total = forecast.reps.reduce((sum, rep) => sum + rep.forecast, 0)
    expect(total).toBeCloseTo(forecast.value, 4)
  })

  it('splits the pipeline contribution without losing or duplicating any', () => {
    const total = forecast.reps.reduce((sum, rep) => sum + rep.fromPipeline, 0)
    expect(total).toBeCloseTo(forecast.expectedFromPipeline, 4)
  })

  it('keeps every rep confidence inside 0-100', () => {
    for (const rep of forecast.reps) {
      expect(rep.confidence).toBeGreaterThanOrEqual(0)
      expect(rep.confidence).toBeLessThanOrEqual(100)
    }
  })

  it('measures each rep against their own target', () => {
    for (const rep of forecast.reps) {
      if (rep.target > 0) {
        expect(rep.attainment).toBeCloseTo(rep.forecast / rep.target, 6)
        expect(rep.gap).toBeCloseTo(rep.forecast - rep.target, 6)
      }
    }
  })
})

describe('waterfall and timeline', () => {
  it('ends the waterfall exactly on the base forecast', () => {
    const last = forecast.waterfall[forecast.waterfall.length - 1]
    expect(last.key).toBe('forecast')
    expect(last.total).toBeCloseTo(forecast.value, 6)
  })

  it('reaches the forecast through its own steps', () => {
    const running = forecast.waterfall
      .filter((step) => step.tone !== 'result')
      .reduce((total, step) => total + step.delta, 0)
    expect(running).toBeCloseTo(forecast.value, 6)
  })

  it('splits the forecast across timeline buckets without inventing revenue', () => {
    const total = forecast.timeline.buckets.reduce((sum, bucket) => sum + bucket.value, 0)
    expect(total).toBeLessThanOrEqual(forecast.expectedFromPipeline + 0.001)
  })
})

describe('forecast risk', () => {
  it('counts only deals the health assessment has flagged, once each', () => {
    const ids = forecast.risk.entries.map((entry) => entry.contribution.opportunity.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const entry of forecast.risk.entries) {
      expect(['at-risk', 'critical']).toContain(entry.contribution.health.band)
    }
  })

  it('never exceeds the projected pipeline it is drawn from', () => {
    expect(forecast.risk.total).toBeLessThanOrEqual(forecast.expectedFromPipeline + 0.001)
    expect(forecast.risk.share).toBeLessThanOrEqual(1)
  })
})

describe('forecast accuracy', () => {
  it('stays unavailable rather than fabricating a variance', () => {
    expect(assessAccuracy([]).available).toBe(false)
    const pending: ForecastSnapshot = {
      id: 'a',
      period: 'mtd:2026-06-01',
      periodLabel: 'This month',
      createdAt: NOW.toISOString(),
      target: 500_000,
      forecastValue: 480_000,
      scenario: 'base',
      confidence: 70,
      probability: 60,
      actualValue: null,
    }
    expect(assessAccuracy([pending]).available).toBe(false)
  })

  it('scores a snapshot once its period has closed', () => {
    const closed: ForecastSnapshot = {
      id: 'a',
      period: 'mtd:2026-05-01',
      periodLabel: 'May',
      createdAt: '2026-05-15T00:00:00.000Z',
      target: 500_000,
      forecastValue: 480_000,
      scenario: 'base',
      confidence: 70,
      probability: 60,
      actualValue: 400_000,
    }
    const accuracy = assessAccuracy([closed])
    expect(accuracy.available).toBe(true)
    expect(accuracy.scored[0].variance).toBe(80_000)
    expect(accuracy.scored[0].accuracy).toBeCloseTo(80, 6)
    expect(accuracy.bias).toBe(80_000)
  })
})
