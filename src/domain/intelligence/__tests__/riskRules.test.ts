import { describe, expect, it } from 'vitest'
import { computeRevenueAtRisk, pipelineGapRule, stalledDealRule } from '../riskRules'
import { assessOpportunityHealth, scorePipeline } from '../opportunityScoring'
import { INTELLIGENCE_THRESHOLDS as T } from '../thresholds'
import type { IntelligenceContext } from '../context'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { NOW, activities, makeOpportunity, testFormatters } from './factories'

/**
 * The rules read a narrow slice of the context each. Rather than building a
 * whole dataset for a unit test, each test supplies the slice its rule uses;
 * the end-to-end wiring is covered by the engine test.
 */
const contextWith = (parts: Partial<IntelligenceContext>): IntelligenceContext =>
  ({ now: NOW, fmt: testFormatters, ...parts }) as IntelligenceContext

const metricsWith = (parts: Record<string, unknown>): CommercialMetrics =>
  ({
    period: {
      start: new Date('2026-06-01T00:00:00.000Z'),
      end: new Date('2026-06-30T23:59:59.999Z'),
      remainingDays: 15,
    },
    ...parts,
  }) as unknown as CommercialMetrics

const silent = (id: string, value: number, probability: number, days = 40) =>
  makeOpportunity({
    id,
    value,
    probability,
    lastActivityAt: new Date(NOW.getTime() - days * 86_400_000).toISOString(),
    expectedCloseDate: new Date(NOW.getTime() + 5 * 86_400_000).toISOString(),
    stageHistory: [{ stage: 'lead', at: '2025-01-01T00:00:00.000Z' }],
  })

describe('revenue at risk', () => {
  const scoredFor = (opportunities: ReturnType<typeof makeOpportunity>[]) =>
    scorePipeline(opportunities, () => activities(1), NOW)

  it('counts each deal once, at its weighted value', () => {
    const report = computeRevenueAtRisk(
      contextWith({ scored: scoredFor([silent('a', 100_000, 0.5), silent('b', 40_000, 0.25)]) }),
    )
    expect(report.entries).toHaveLength(2)
    // 100_000 * 0.5 + 40_000 * 0.25
    expect(report.total).toBe(60_000)
    expect(new Set(report.entries.map((e) => e.opportunity.id)).size).toBe(2)
  })

  it('excludes healthy deals entirely', () => {
    const report = computeRevenueAtRisk(
      contextWith({ scored: scoredFor([makeOpportunity({ id: 'healthy' })]) }),
    )
    expect(report.entries).toHaveLength(0)
    expect(report.total).toBe(0)
  })

  it('only counts deals in the at-risk and critical bands', () => {
    const scored = scoredFor([silent('a', 100_000, 0.5), makeOpportunity({ id: 'healthy' })])
    const report = computeRevenueAtRisk(contextWith({ scored }))
    for (const entry of report.entries) {
      expect(['at-risk', 'critical']).toContain(entry.scored.health.band)
    }
  })

  it('is never larger than the weighted value of the whole open pipeline', () => {
    const opportunities = [silent('a', 100_000, 0.5), makeOpportunity({ id: 'healthy' })]
    const weightedPipeline = opportunities.reduce(
      (total, o) => total + o.value * o.probability,
      0,
    )
    const report = computeRevenueAtRisk(contextWith({ scored: scoredFor(opportunities) }))
    expect(report.total).toBeLessThanOrEqual(weightedPipeline)
  })

  it('ranks the largest exposure first', () => {
    const report = computeRevenueAtRisk(
      contextWith({
        scored: scoredFor([silent('small', 20_000, 0.5), silent('big', 200_000, 0.5)]),
      }),
    )
    expect(report.entries[0].opportunity.id).toBe('big')
  })
})

describe('pipeline gap', () => {
  it('says nothing when coverage is healthy', () => {
    const drafts = pipelineGapRule(
      contextWith({
        metrics: metricsWith({
          coverage: T.healthyCoverage + 1,
          remainingToTarget: 200_000,
          pipelineTotal: 900_000,
        }),
      }),
    )
    expect(drafts).toHaveLength(0)
  })

  it('says nothing once the target is already booked', () => {
    const drafts = pipelineGapRule(
      contextWith({
        metrics: metricsWith({ coverage: 0.5, remainingToTarget: 0, pipelineTotal: 100_000 }),
      }),
    )
    expect(drafts).toHaveLength(0)
  })

  it('reports the missing pipeline, not the missing revenue', () => {
    const [draft] = pipelineGapRule(
      contextWith({
        metrics: metricsWith({
          coverage: 1,
          remainingToTarget: 200_000,
          pipelineTotal: 200_000,
        }),
      }),
    )
    // Healthy coverage needs 3x 200_000 = 600_000; 200_000 exists.
    expect(draft.impact).toBe(400_000)
    expect(draft.id).toBe('risk.pipeline-gap')
  })

  it('is more confident the further coverage falls below the critical line', () => {
    const at = (coverage: number) =>
      pipelineGapRule(
        contextWith({
          metrics: metricsWith({ coverage, remainingToTarget: 200_000, pipelineTotal: 100_000 }),
        }),
      )[0].confidence
    expect(at(1)).toBeGreaterThan(at(2.5))
  })
})

describe('stalled deals', () => {
  it('raises one company-level signal rather than one per deal', () => {
    const scored = scorePipeline(
      [silent('a', 100_000, 0.5), silent('b', 80_000, 0.4), silent('c', 60_000, 0.3)],
      () => activities(1),
      NOW,
    )
    const drafts = stalledDealRule(
      contextWith({
        scored,
        metrics: metricsWith({ target: 500_000 }),
        customerName: () => 'Test account',
      }),
    )
    expect(drafts).toHaveLength(1)
    expect(drafts[0].title).toContain('3 opportunities')
  })

  it('says nothing when every deal is being worked', () => {
    const scored = scorePipeline([makeOpportunity()], () => activities(3), NOW)
    expect(
      stalledDealRule(
        contextWith({
          scored,
          metrics: metricsWith({ target: 500_000 }),
          customerName: () => 'Test account',
        }),
      ),
    ).toHaveLength(0)
  })

  it('uses the same stalled threshold as the health assessment', () => {
    const opportunity = silent('a', 100_000, 0.5, T.stalledDays)
    const health = assessOpportunityHealth(opportunity, {
      now: NOW,
      activities: activities(1),
      averageOpenValue: 100_000,
    })
    expect(health.inactiveDays).toBeGreaterThanOrEqual(T.stalledDays)
    const drafts = stalledDealRule(
      contextWith({
        scored: scorePipeline([opportunity], () => activities(1), NOW),
        metrics: metricsWith({ target: 500_000 }),
        customerName: () => 'Test account',
      }),
    )
    expect(drafts).toHaveLength(1)
  })
})
