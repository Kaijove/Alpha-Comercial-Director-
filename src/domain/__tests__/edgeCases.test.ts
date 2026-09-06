import { describe, expect, it } from 'vitest'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { runIntelligence } from '@/domain/intelligence/intelligenceEngine'
import { buildReport } from '@/domain/reports/reportEngine'
import { REPORT_TYPES } from '@/domain/reports/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { daysSince, daysUntil, type CommercialDataset } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import {
  makeWorkspace,
  NOW,
  testFormatters,
} from '@/domain/intelligence/__tests__/factories'

/**
 * Degenerate but entirely legitimate data.
 *
 * A brand-new workspace has no deals. A small business has one rep and one
 * customer. A director may not have set a target yet. None of that is
 * corruption, and none of it may produce NaN, Infinity, a division by zero or a
 * crash on a screen someone is about to show their CEO.
 */
const period = resolvePeriod('mtd', NOW)
const workspace = makeWorkspace()

const owner = { id: 'o1', name: 'Solo Rep', role: 'AE', accent: 0 }
const customer = {
  id: 'c1',
  name: 'Only Account',
  industry: 'Industry',
  region: 'Region',
  createdAt: NOW.toISOString(),
}

const emptyDataset: CommercialDataset = {
  generatorVersion: 1,
  seed: 1,
  generatedAt: NOW.toISOString(),
  owners: [],
  customers: [],
  opportunities: [],
  activities: [],
}

const deal = (overrides: Partial<CommercialDataset['opportunities'][number]> = {}) => ({
  id: 'd1',
  name: 'The only deal',
  customerId: 'c1',
  ownerId: 'o1',
  stage: 'proposal' as const,
  value: 10_000,
  probability: 0.5,
  probabilityIsManual: false,
  expectedCloseDate: NOW.toISOString(),
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
  closedAt: null,
  product: '',
  source: '',
  region: '',
  notes: '',
  stageHistory: [{ stage: 'lead' as const, at: NOW.toISOString() }],
  stageEnteredAt: NOW.toISOString(),
  ...overrides,
})

const withData = (
  opportunities: CommercialDataset['opportunities'],
): CommercialDataset => ({
  ...emptyDataset,
  owners: [owner],
  customers: [customer],
  opportunities,
})

/** Every number a screen could render, from one metrics snapshot. */
function figuresOf(metrics: ReturnType<typeof computeCommercialMetrics>) {
  return {
    revenue: metrics.revenue,
    previousRevenue: metrics.previousRevenue,
    revenueDelta: metrics.revenueDelta,
    target: metrics.target,
    attainment: metrics.attainment,
    pace: metrics.pace,
    remainingToTarget: metrics.remainingToTarget,
    perDayNeeded: metrics.perDayNeeded,
    pipelineTotal: metrics.pipelineTotal,
    weightedPipeline: metrics.weightedPipeline,
    coverage: metrics.coverage,
    winRate: metrics.winRate,
    averageDealSize: metrics.averageDealSize,
    forecast: metrics.forecast.value,
    forecastGap: metrics.forecast.gap,
    forecastAttainment: metrics.forecast.attainment,
    confidence: metrics.forecast.confidence.score,
    probability: metrics.forecast.probability.score,
    quality: metrics.forecast.quality.score,
    riskTotal: metrics.forecast.risk.total,
    riskShare: metrics.forecast.risk.share,
  }
}

/** Null is a legitimate "not measurable"; NaN and Infinity never are. */
function expectAllSane(figures: Record<string, number | null>) {
  for (const [name, value] of Object.entries(figures)) {
    if (value === null) continue
    expect(typeof value, `${name} should be numeric`).toBe('number')
    expect(Number.isNaN(value), `${name} is NaN`).toBe(false)
    expect(Number.isFinite(value), `${name} = ${value}`).toBe(true)
  }
}

describe('an empty workspace', () => {
  it('computes without throwing', () => {
    expect(() =>
      computeCommercialMetrics(emptyDataset, workspace, period, null),
    ).not.toThrow()
  })

  it('produces no NaN and no Infinity anywhere', () => {
    const metrics = computeCommercialMetrics(emptyDataset, workspace, period, null)
    expectAllSane(figuresOf(metrics))
  })

  it('reports nothing measurable as null rather than zero-divided', () => {
    const metrics = computeCommercialMetrics(emptyDataset, workspace, period, null)
    expect(metrics.winRate).toBeNull()
    expect(metrics.averageDealSize).toBeNull()
    expect(metrics.revenue).toBe(0)
    expect(metrics.pipelineTotal).toBe(0)
  })

  it('runs the intelligence engine on nothing at all', () => {
    const metrics = computeCommercialMetrics(emptyDataset, workspace, period, null)
    const result = runIntelligence({
      dataset: emptyDataset,
      workspace,
      metrics,
      now: NOW,
      fmt: testFormatters,
      statuses: {},
      activitiesFor: () => [],
      customerName: () => 'Unknown',
      ownerName: () => 'Unassigned',
    })
    expect(Number.isFinite(result.health.score)).toBe(true)
    expect(result.health.score).toBeGreaterThanOrEqual(0)
    expect(result.health.score).toBeLessThanOrEqual(100)
  })

  it('builds a report without inventing anything', () => {
    const report = buildReport({
      config: {
        type: 'executive',
        period: 'this-month',
        sections: [...REPORT_TYPES[0].sections],
        ownerId: null,
      },
      dataset: emptyDataset,
      workspace,
      now: NOW,
      fmt: testFormatters,
      statuses: {},
      activitiesFor: () => [],
      customerName: () => 'Unknown',
      ownerName: () => 'Unassigned',
    })
    expect(report.gaps.length).toBeGreaterThan(0)
    for (const paragraph of report.summary) {
      expect(paragraph).not.toContain('NaN')
      expect(paragraph).not.toContain('Infinity')
      expect(paragraph).not.toContain('undefined')
    }
    for (const kpi of report.kpis) {
      expect(kpi.value).not.toContain('NaN')
      expect(kpi.value).not.toContain('Infinity')
    }
  })
})

describe('a workspace with exactly one of everything', () => {
  const oneWon = withData([
    deal({ stage: 'won', closedAt: NOW.toISOString(), probability: 1 }),
  ])
  const oneLost = withData([
    deal({ id: 'd2', stage: 'lost', closedAt: NOW.toISOString(), probability: 0 }),
  ])
  const oneOpen = withData([deal()])

  it('handles a single won deal', () => {
    const metrics = computeCommercialMetrics(oneWon, workspace, period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.revenue).toBe(10_000)
    expect(metrics.winRate).toBe(1)
    expect(metrics.averageDealSize).toBe(10_000)
  })

  it('handles a single lost deal without dividing by zero', () => {
    const metrics = computeCommercialMetrics(oneLost, workspace, period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.winRate).toBe(0)
    expect(metrics.revenue).toBe(0)
    // No won deals, so there is no average to report.
    expect(metrics.averageDealSize).toBeNull()
  })

  it('handles a single open deal', () => {
    const metrics = computeCommercialMetrics(oneOpen, workspace, period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.pipelineTotal).toBe(10_000)
    expect(metrics.weightedPipeline).toBe(5_000)
    expect(metrics.winRate).toBeNull()
  })

  it('ranks a team of one', () => {
    const metrics = computeCommercialMetrics(oneWon, workspace, period, null)
    expect(metrics.reps).toHaveLength(1)
    expectAllSane({
      attainment: metrics.reps[0].attainment,
      coverage: metrics.reps[0].coverage,
      winRate: metrics.reps[0].winRate,
      averageDealSize: metrics.reps[0].averageDealSize,
    })
  })
})

describe('targets at the boundaries', () => {
  const dataset = withData([deal({ stage: 'won', closedAt: NOW.toISOString() })])

  const withTarget = (monthlyTarget: number): Workspace => ({
    ...workspace,
    goals: { ...workspace.goals, monthlyTarget, annualTarget: monthlyTarget * 12 },
  })

  it('survives a target of zero without dividing by it', () => {
    const metrics = computeCommercialMetrics(dataset, withTarget(0), period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.attainment).toBeNull()
    expect(metrics.forecast.attainment).toBeNull()
    expect(metrics.pace).toBeNull()
  })

  it('survives a target of one cent', () => {
    const metrics = computeCommercialMetrics(dataset, withTarget(0.01), period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.attainment).toBeGreaterThan(0)
  })

  it('survives an implausibly large target', () => {
    const metrics = computeCommercialMetrics(dataset, withTarget(1e12), period, null)
    expectAllSane(figuresOf(metrics))
    expect(metrics.attainment).toBeGreaterThan(0)
    expect(metrics.attainment).toBeLessThan(1)
  })

  it('handles revenue exactly equal to target', () => {
    const metrics = computeCommercialMetrics(dataset, withTarget(10_000), period, null)
    expect(metrics.attainment).toBe(1)
    expect(metrics.remainingToTarget).toBe(0)
    expectAllSane(figuresOf(metrics))
  })

  it('handles revenue above target without a negative remainder', () => {
    const metrics = computeCommercialMetrics(dataset, withTarget(5_000), period, null)
    expect(metrics.attainment).toBe(2)
    expect(metrics.remainingToTarget).toBe(0)
    // Coverage against a covered target is not measurable, not infinite.
    expect(metrics.coverage === null || Number.isFinite(metrics.coverage)).toBe(true)
    expectAllSane(figuresOf(metrics))
  })
})

describe('forecast values stay inside their own bounds', () => {
  const scenarios: Record<string, CommercialDataset> = {
    'no pipeline': withData([]),
    'all certain': withData([
      deal({ id: 'a', probability: 1 }),
      deal({ id: 'b', probability: 1 }),
    ]),
    'all hopeless': withData([
      deal({ id: 'a', probability: 0 }),
      deal({ id: 'b', probability: 0 }),
    ]),
    'one enormous deal': withData([deal({ value: 50_000_000, probability: 0.9 })]),
    'many tiny deals': withData(
      Array.from({ length: 200 }, (_, i) => deal({ id: `d${i}`, value: 100 })),
    ),
    'everything already closed': withData([
      deal({ id: 'a', stage: 'won', closedAt: NOW.toISOString() }),
      deal({ id: 'b', stage: 'lost', closedAt: NOW.toISOString() }),
    ]),
    'closing far in the future': withData([
      deal({ expectedCloseDate: new Date(NOW.getTime() + 400 * 86_400_000).toISOString() }),
    ]),
    'closing in the past': withData([
      deal({ expectedCloseDate: new Date(NOW.getTime() - 90 * 86_400_000).toISOString() }),
    ]),
  }

  for (const [name, dataset] of Object.entries(scenarios)) {
    it(`keeps every figure valid: ${name}`, () => {
      const metrics = computeCommercialMetrics(dataset, workspace, period, null)
      const forecast = metrics.forecast
      expectAllSane(figuresOf(metrics))

      expect(forecast.confidence.score).toBeGreaterThanOrEqual(0)
      expect(forecast.confidence.score).toBeLessThanOrEqual(100)
      expect(forecast.probability.score).toBeGreaterThanOrEqual(0)
      expect(forecast.probability.score).toBeLessThanOrEqual(100)
      expect(forecast.quality.score).toBeGreaterThanOrEqual(0)
      expect(forecast.quality.score).toBeLessThanOrEqual(100)
      expect(forecast.value).toBeGreaterThanOrEqual(0)
      expect(forecast.risk.share).toBeGreaterThanOrEqual(0)
      expect(forecast.risk.share).toBeLessThanOrEqual(1)

      // The scenarios must stay ordered whatever the shape of the pipeline.
      expect(forecast.scenarios.worst.value).toBeLessThanOrEqual(forecast.scenarios.base.value)
      expect(forecast.scenarios.base.value).toBeLessThanOrEqual(forecast.scenarios.best.value)

      for (const entry of forecast.contributions) {
        expect(entry.probability).toBeGreaterThanOrEqual(0)
        expect(entry.probability).toBeLessThanOrEqual(1)
        expect(entry.contribution).toBeGreaterThanOrEqual(0)
        expect(entry.contribution).toBeLessThanOrEqual(entry.value)
      }
    })
  }
})

describe('formatters never emit broken output', () => {
  const context = { locale: 'en-GB', currency: 'EUR', compactNumbers: false }
  const nasty = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]

  it('renders currency for NaN and Infinity without leaking them', () => {
    for (const value of nasty) {
      const output = formatCurrency(value, context)
      expect(output).not.toContain('NaN')
      expect(output).not.toContain('Infinity')
      expect(output).not.toContain('undefined')
    }
  })

  it('renders numbers and percentages the same way', () => {
    for (const value of nasty) {
      expect(formatNumber(value, context)).not.toMatch(/NaN|Infinity|undefined/)
      expect(formatPercent(value, context)).not.toMatch(/NaN|Infinity|undefined/)
    }
  })

  it('still formats real values correctly', () => {
    expect(formatCurrency(125_000, context)).toContain('125')
    expect(formatPercent(0.843, context, 1)).toContain('84.3')
  })
})

describe('the best case can never fall below the base case', () => {
  // A pipeline of deals the health engine calls critical: silent for months and
  // long overdue. Base credits them at a heavy discount; the best case used to
  // drop them entirely, which inverted the two.
  const stale = new Date(NOW.getTime() - 200 * 86_400_000).toISOString()
  const critical = withData([
    deal({ id: 'a', lastActivityAt: stale, expectedCloseDate: stale, stageEnteredAt: stale }),
    deal({ id: 'b', lastActivityAt: stale, expectedCloseDate: stale, stageEnteredAt: stale }),
  ])

  it('holds for a pipeline of critical deals', () => {
    const { forecast } = computeCommercialMetrics(critical, workspace, period, null)
    expect(forecast.scenarios.base.value).toBeLessThanOrEqual(forecast.scenarios.best.value)
  })

  it('holds per deal, not just in aggregate', () => {
    const { forecast } = computeCommercialMetrics(critical, workspace, period, null)
    for (const entry of forecast.contributions) {
      expect(entry.bestCaseContribution).toBeGreaterThanOrEqual(entry.contribution)
    }
  })
})

describe('elapsed durations never run backwards', () => {
  // `now` is pinned when a screen mounts, so anything created or moved a moment
  // later carries a timestamp after it. That produced "-1 days in this stage"
  // on a deal the director had just created.
  const justAfterMount = new Date(NOW.getTime() + 1_500).toISOString()

  it('reports zero, not minus one, for a timestamp in the near future', () => {
    expect(daysSince(justAfterMount, NOW)).toBe(0)
  })

  it('reports zero for a timestamp far in the future', () => {
    expect(daysSince(new Date(NOW.getTime() + 30 * 86_400_000).toISOString(), NOW)).toBe(0)
  })

  it('still counts real elapsed days', () => {
    expect(daysSince(new Date(NOW.getTime() - 3 * 86_400_000).toISOString(), NOW)).toBe(3)
  })

  it('returns zero for an unparseable date rather than NaN', () => {
    expect(daysSince('not-a-date', NOW)).toBe(0)
  })

  it('keeps daysUntil signed so overdue deals stay detectable', () => {
    expect(daysUntil(new Date(NOW.getTime() - 5 * 86_400_000).toISOString(), NOW)).toBeLessThan(0)
    expect(daysUntil(new Date(NOW.getTime() + 5 * 86_400_000).toISOString(), NOW)).toBeGreaterThan(0)
    expect(daysUntil('not-a-date', NOW)).toBe(0)
  })
})
