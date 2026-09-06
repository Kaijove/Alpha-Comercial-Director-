import { describe, expect, it } from 'vitest'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { runIntelligence } from '@/domain/intelligence/intelligenceEngine'
import { buildReport } from '@/domain/reports/reportEngine'
import { REPORT_TYPES } from '@/domain/reports/types'
import type { CommercialDataset, Opportunity, Stage } from '@/domain/commerce'
import { makeWorkspace, NOW, testFormatters } from '@/domain/intelligence/__tests__/factories'

/**
 * Scale.
 *
 * A director with twenty reps and a couple of thousand deals is not an exotic
 * case, and the derivation runs on every filter change. These tests exist to
 * catch an accidental O(n squared): they assert a budget generous enough not to
 * be flaky on a loaded machine, but tight enough that a nested scan over the
 * opportunity list would blow straight through it.
 */
const period = resolvePeriod('mtd', NOW)
const workspace = makeWorkspace()
const STAGES: Stage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

function build(opportunityCount: number, repCount: number, customerCount: number) {
  const owners = Array.from({ length: repCount }, (_, i) => ({
    id: `o${i}`, name: `Rep ${i}`, role: 'AE', accent: i % 6,
  }))
  const customers = Array.from({ length: customerCount }, (_, i) => ({
    id: `c${i}`, name: `Account ${i}`, industry: 'Industry', region: 'Region',
    createdAt: NOW.toISOString(),
  }))

  const opportunities: Opportunity[] = Array.from({ length: opportunityCount }, (_, i) => {
    const stage = STAGES[i % STAGES.length]
    const closed = stage === 'won' || stage === 'lost'
    const at = new Date(NOW.getTime() - (i % 120) * 86_400_000).toISOString()
    return {
      id: `d${i}`, name: `Deal ${i}`,
      customerId: `c${i % customerCount}`, ownerId: `o${i % repCount}`,
      stage, value: 5_000 + (i % 40) * 1_500,
      probability: [0.1, 0.25, 0.5, 0.75, 1, 0][i % 6],
      probabilityIsManual: false,
      expectedCloseDate: new Date(NOW.getTime() + (i % 60) * 86_400_000).toISOString(),
      createdAt: at, updatedAt: at, lastActivityAt: at,
      closedAt: closed ? at : null,
      product: 'P', source: 'S', region: 'R', notes: '',
      stageHistory: [{ stage: 'lead', at }], stageEnteredAt: at,
    }
  })

  const activities = Array.from({ length: opportunityCount * 3 }, (_, i) => ({
    id: `a${i}`,
    opportunityId: `d${i % opportunityCount}`,
    ownerId: `o${i % repCount}`,
    type: 'call' as const,
    at: new Date(NOW.getTime() - (i % 90) * 86_400_000).toISOString(),
    summary: '',
  }))

  return {
    generatorVersion: 1, seed: 1, generatedAt: NOW.toISOString(),
    owners, customers, opportunities, activities,
  } satisfies CommercialDataset
}

const sizes = [3, 10, 50, 200, 500, 1000]

describe('the metrics layer scales', () => {
  for (const size of sizes) {
    it(`handles ${size} opportunities`, () => {
      const dataset = build(size, Math.min(20, Math.max(1, Math.ceil(size / 25))), Math.min(100, Math.max(1, size)))
      const metrics = computeCommercialMetrics(dataset, workspace, period, null)
      expect(Number.isFinite(metrics.revenue)).toBe(true)
      expect(Number.isFinite(metrics.forecast.value)).toBe(true)
      expect(metrics.weightedPipeline).toBeLessThanOrEqual(metrics.pipelineTotal)
    })
  }

  it('does not scale quadratically from 250 to 1000 deals', () => {
    const small = build(250, 20, 100)
    const large = build(1000, 20, 100)

    const time = (dataset: CommercialDataset) => {
      // One warm run so the comparison is not measuring first-call overhead.
      computeCommercialMetrics(dataset, workspace, period, null)
      const started = performance.now()
      for (let i = 0; i < 3; i += 1) {
        computeCommercialMetrics(dataset, workspace, period, null)
      }
      return (performance.now() - started) / 3
    }

    const smallMs = time(small)
    const largeMs = time(large)
    // Four times the data. Linear would be ~4x; quadratic would be ~16x.
    // Eight leaves room for noise while still failing on a nested scan.
    const ratio = largeMs / Math.max(smallMs, 0.01)
    expect(ratio, `250 deals ${smallMs.toFixed(1)}ms -> 1000 deals ${largeMs.toFixed(1)}ms (${ratio.toFixed(1)}x)`).toBeLessThan(8)
  })
})

describe('the full derivation stays within budget at 1000 deals', () => {
  const dataset = build(1000, 20, 100)

  it('computes metrics, intelligence and a report', () => {
    const started = performance.now()
    const metrics = computeCommercialMetrics(dataset, workspace, period, null)
    const intelligence = runIntelligence({
      dataset, workspace, metrics, now: NOW, fmt: testFormatters, statuses: {},
      activitiesFor: () => [], customerName: () => 'A', ownerName: () => 'O',
    })
    const report = buildReport({
      config: { type: 'executive', period: 'this-month', sections: [...REPORT_TYPES[0].sections], ownerId: null },
      dataset, workspace, now: NOW, fmt: testFormatters, statuses: {},
      activitiesFor: () => [], customerName: () => 'A', ownerName: () => 'O',
    })
    const elapsed = performance.now() - started

    expect(intelligence.insights.length).toBeGreaterThanOrEqual(0)
    expect(report.sections.length).toBeGreaterThan(0)
    expect(elapsed, `full derivation took ${elapsed.toFixed(0)}ms`).toBeLessThan(2000)
  })
})
