import { describe, expect, it } from 'vitest'
import { generateCommercialData } from '@/data/seed/generateCommercialData'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { assessCommercialHealth } from '@/domain/health/commercialHealth'
import { computeBaseline } from '../anomalyEngine'
import { runIntelligence, type IntelligenceInput } from '../intelligenceEngine'
import { NOW, makeWorkspace, testFormatters } from './factories'

/**
 * End-to-end over the real seeded dataset: the engine, every rule and the
 * shared metrics layer wired exactly as the app wires them.
 */
const workspace = makeWorkspace()
const dataset = generateCommercialData(workspace, NOW)
const period = resolvePeriod('mtd', NOW)
const metrics = computeCommercialMetrics(dataset, workspace, period, null)

const activityIndex = new Map<string, typeof dataset.activities>()
for (const activity of dataset.activities) {
  const list = activityIndex.get(activity.opportunityId) ?? []
  list.push(activity)
  activityIndex.set(activity.opportunityId, list)
}

const input = (statuses: IntelligenceInput['statuses'] = {}): IntelligenceInput => ({
  dataset,
  workspace,
  metrics,
  now: NOW,
  fmt: testFormatters,
  statuses,
  activitiesFor: (id) => activityIndex.get(id) ?? [],
  customerName: (id) => dataset.customers.find((c) => c.id === id)?.name ?? 'Unknown',
  ownerName: (id) => dataset.owners.find((o) => o.id === id)?.name ?? 'Unassigned',
})

describe('intelligence engine', () => {
  const result = runIntelligence(input())

  it('produces the same insights, in the same order, for the same data', () => {
    const again = runIntelligence(input())
    expect(again.insights.map((i) => i.id)).toEqual(result.insights.map((i) => i.id))
    expect(again.insights.map((i) => i.priorityScore)).toEqual(
      result.insights.map((i) => i.priorityScore),
    )
    expect(again.revenueAtRisk.total).toBe(result.revenueAtRisk.total)
  })

  it('gives every insight a unique, stable id', () => {
    const ids = result.insights.map((insight) => insight.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.includes('.'))).toBe(true)
  })

  it('never raises two signals about the same underlying problem', () => {
    // Stalled deals are a company-level signal; the per-rep coaching version
    // belongs on the Team page, not next to it in the feed.
    const stalled = result.insights.filter((insight) => insight.id.includes('stalled'))
    expect(stalled.length).toBeLessThanOrEqual(1)
  })

  it('sorts by severity first and priority score second', () => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, positive: 4 }
    for (let i = 1; i < result.insights.length; i += 1) {
      const previous = result.insights[i - 1]
      const current = result.insights[i]
      expect(order[previous.severity]).toBeLessThanOrEqual(order[current.severity])
      if (previous.severity === current.severity) {
        expect(previous.priorityScore).toBeGreaterThanOrEqual(current.priorityScore)
      }
    }
  })

  it('gives every insight the evidence a director needs to check it', () => {
    for (const insight of result.insights) {
      expect(insight.title.length).toBeGreaterThan(0)
      expect(insight.reason.length).toBeGreaterThan(0)
      expect(insight.reason).not.toBe(insight.description)
      expect(insight.triggers.length).toBeGreaterThan(0)
      expect(insight.recommendation.length).toBeGreaterThan(0)
    }
  })

  it('keeps revenue at risk within the weighted open pipeline', () => {
    expect(result.revenueAtRisk.total).toBeGreaterThanOrEqual(0)
    expect(result.revenueAtRisk.total).toBeLessThanOrEqual(metrics.weightedPipeline)
  })

  it('counts each exposed deal exactly once', () => {
    const ids = result.revenueAtRisk.entries.map((entry) => entry.opportunity.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports overview counts that agree with the insight list', () => {
    const live = result.insights.filter(
      (insight) => insight.status !== 'dismissed' && insight.status !== 'resolved',
    )
    expect(result.overview.unresolvedCount).toBe(live.length)
    expect(result.overview.criticalCount).toBe(
      live.filter((i) => i.severity === 'critical').length,
    )
    expect(result.overview.revenueAtRisk).toBe(result.revenueAtRisk.total)
    expect(result.overview.opportunitiesNeedingAttention).toBe(
      result.scored.filter((entry) => entry.health.band !== 'healthy').length,
    )
  })

  it('applies persisted statuses without regenerating different insights', () => {
    const first = result.insights[0]
    const withStatus = runIntelligence(input({ [first.id]: 'dismissed' }))
    expect(withStatus.insights.map((i) => i.id)).toEqual(result.insights.map((i) => i.id))
    expect(withStatus.insights[0].status).toBe('dismissed')
    expect(withStatus.overview.unresolvedCount).toBe(result.overview.unresolvedCount - 1)
  })

  it('does not change the commercial data when an insight is dismissed', () => {
    const before = dataset.opportunities.length
    runIntelligence(input({ 'risk.pipeline-gap': 'dismissed' }))
    expect(dataset.opportunities).toHaveLength(before)
  })
})

describe('anomaly detection', () => {
  it('has enough history to speak on a full simulated dataset', () => {
    const baseline = computeBaseline(dataset, NOW)
    expect(baseline.sufficient).toBe(true)
    expect(baseline.months).toBeGreaterThanOrEqual(3)
    expect(baseline.revenuePerMonth).toBeGreaterThan(0)
  })

  it('stays silent rather than guessing when there is no history', () => {
    const empty = { ...dataset, opportunities: [], activities: [] }
    const baseline = computeBaseline(empty, NOW)
    expect(baseline.sufficient).toBe(false)
    const result = runIntelligence({ ...input(), dataset: empty })
    expect(result.anomaliesUnavailable).toBe(true)
    expect(result.insights.some((insight) => insight.id.startsWith('anomaly.'))).toBe(false)
  })
})

describe('commercial health', () => {
  it('scores 0-100 and picks a status from the score', () => {
    const health = assessCommercialHealth(metrics)
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
    expect(health.signals.length).toBeGreaterThan(0)
    expect(health.summary.length).toBeGreaterThan(0)
  })

  it('weights its signals to 1', () => {
    const total = assessCommercialHealth(metrics, {
      revenueAtRiskRatio: 0.2,
      stalledRatio: 0.1,
      teamAtRiskRatio: 0.25,
    }).signals.reduce((sum, signal) => sum + signal.weight, 0)
    expect(total).toBeCloseTo(1, 5)
  })

  it('falls when exposure, silence and team risk all rise', () => {
    const calm = assessCommercialHealth(metrics, {
      revenueAtRiskRatio: 0,
      stalledRatio: 0,
      teamAtRiskRatio: 0,
    })
    const strained = assessCommercialHealth(metrics, {
      revenueAtRiskRatio: 0.9,
      stalledRatio: 0.8,
      teamAtRiskRatio: 1,
    })
    expect(strained.score).toBeLessThan(calm.score)
  })

  it('is the same health the engine reports, so two screens cannot disagree', () => {
    const engine = runIntelligence(input())
    const again = runIntelligence(input())
    expect(again.health.score).toBe(engine.health.score)
    expect(again.health.status).toBe(engine.health.status)
  })
})
