import { describe, expect, it } from 'vitest'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { runIntelligence } from '@/domain/intelligence/intelligenceEngine'
import { buildReport } from '@/domain/reports/reportEngine'
import { buildFunnel } from '@/domain/metrics/funnel'
import { REPORT_TYPES } from '@/domain/reports/types'
import type { CommercialDataset, Opportunity } from '@/domain/commerce'
import { makeWorkspace, NOW, testFormatters } from '@/domain/intelligence/__tests__/factories'

/**
 * One change, every screen.
 *
 * Each screen reads the same metrics snapshot, so a figure cannot drift between
 * the Dashboard and the Forecast by construction. These tests hold that
 * construction in place: they change one field on one opportunity and assert
 * that everything downstream moves by exactly the right amount - and that
 * nothing unrelated moves at all.
 */
const period = resolvePeriod('mtd', NOW)
const workspace = makeWorkspace()
const inPeriod = new Date(NOW.getTime() + 3 * 86_400_000).toISOString()

const owners = [
  { id: 'rep_a', name: 'Rep A', role: 'AE', accent: 0 },
  { id: 'rep_b', name: 'Rep B', role: 'AE', accent: 1 },
]
const customers = [
  { id: 'cus_a', name: 'Account A', industry: 'I', region: 'R', createdAt: NOW.toISOString() },
]

const subject: Opportunity = {
  id: 'subject',
  name: 'The deal under test',
  customerId: 'cus_a',
  ownerId: 'rep_a',
  stage: 'proposal',
  value: 100_000,
  probability: 0.25,
  probabilityIsManual: true,
  expectedCloseDate: inPeriod,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  lastActivityAt: NOW.toISOString(),
  closedAt: null,
  product: 'P',
  source: 'S',
  region: 'R',
  notes: '',
  stageHistory: [{ stage: 'lead', at: NOW.toISOString() }],
  stageEnteredAt: NOW.toISOString(),
}

const datasetWith = (opportunity: Opportunity): CommercialDataset => ({
  generatorVersion: 1,
  seed: 1,
  generatedAt: NOW.toISOString(),
  owners,
  customers,
  opportunities: [opportunity],
  activities: [],
})

/** Everything a screen would show, gathered from the shared engines once. */
function screensFor(dataset: CommercialDataset) {
  const metrics = computeCommercialMetrics(dataset, workspace, period, null)
  const intelligence = runIntelligence({
    dataset,
    workspace,
    metrics,
    now: NOW,
    fmt: testFormatters,
    statuses: {},
    activitiesFor: () => [],
    customerName: () => 'Account A',
    ownerName: (id) => owners.find((o) => o.id === id)?.name ?? 'Unassigned',
  })
  const report = buildReport({
    config: {
      type: 'executive',
      period: 'this-month',
      sections: [...REPORT_TYPES[0].sections],
      ownerId: null,
    },
    dataset,
    workspace,
    now: NOW,
    fmt: testFormatters,
    statuses: {},
    activitiesFor: () => [],
    customerName: () => 'Account A',
    ownerName: (id) => owners.find((o) => o.id === id)?.name ?? 'Unassigned',
  })

  return {
    dashboardPipeline: metrics.pipelineTotal,
    dashboardWeighted: metrics.weightedPipeline,
    dashboardRevenue: metrics.revenue,
    analyticsFunnel: buildFunnel(dataset.opportunities, period),
    teamRepA: metrics.reps.find((rep) => rep.owner.id === 'rep_a')!,
    teamRepB: metrics.reps.find((rep) => rep.owner.id === 'rep_b')!,
    forecastValue: metrics.forecast.value,
    forecastContribution:
      metrics.forecast.contributions.find((c) => c.opportunity.id === 'subject')
        ?.contribution ?? 0,
    intelligenceHealth: intelligence.health.score,
    reportPipeline: report.metrics.pipelineTotal,
    reportForecast: report.forecast.value,
    reportRevenue: report.metrics.revenue,
  }
}

const before = screensFor(datasetWith(subject))

describe('changing the deal value', () => {
  const after = screensFor(datasetWith({ ...subject, value: 200_000 }))

  it('doubles the pipeline on the dashboard', () => {
    expect(before.dashboardPipeline).toBe(100_000)
    expect(after.dashboardPipeline).toBe(200_000)
  })

  it('doubles the weighted pipeline', () => {
    expect(after.dashboardWeighted).toBe(before.dashboardWeighted * 2)
  })

  it('doubles the forecast contribution', () => {
    expect(after.forecastContribution).toBeCloseTo(before.forecastContribution * 2, 6)
  })

  it('moves the team figure for the owning rep only', () => {
    expect(after.teamRepA.pipeline).toBe(200_000)
    expect(after.teamRepB.pipeline).toBe(before.teamRepB.pipeline)
  })

  it('reports the same pipeline the dashboard shows', () => {
    expect(after.reportPipeline).toBe(after.dashboardPipeline)
    expect(after.reportForecast).toBe(after.forecastValue)
  })

  it('leaves revenue alone: the deal is still open', () => {
    expect(after.dashboardRevenue).toBe(before.dashboardRevenue)
  })
})

describe('changing the probability', () => {
  const after = screensFor(datasetWith({ ...subject, probability: 0.5 }))

  it('moves the weighted pipeline but not the face value', () => {
    expect(after.dashboardPipeline).toBe(before.dashboardPipeline)
    expect(after.dashboardWeighted).toBe(50_000)
    expect(before.dashboardWeighted).toBe(25_000)
  })

  it('moves the forecast', () => {
    expect(after.forecastValue).toBeGreaterThan(before.forecastValue)
  })

  it('moves the rep weighted pipeline', () => {
    expect(after.teamRepA.weightedPipeline).toBe(50_000)
  })
})

describe('changing the owner', () => {
  const after = screensFor(datasetWith({ ...subject, ownerId: 'rep_b' }))

  it('moves the pipeline from one rep to the other', () => {
    expect(after.teamRepA.pipeline).toBe(0)
    expect(after.teamRepB.pipeline).toBe(100_000)
  })

  it('leaves every company-level figure untouched', () => {
    expect(after.dashboardPipeline).toBe(before.dashboardPipeline)
    expect(after.dashboardWeighted).toBe(before.dashboardWeighted)
    expect(after.forecastValue).toBe(before.forecastValue)
    expect(after.intelligenceHealth).toBe(before.intelligenceHealth)
  })
})

describe('moving the deal to won', () => {
  const won = screensFor(
    datasetWith({
      ...subject,
      stage: 'won',
      probability: 1,
      closedAt: NOW.toISOString(),
      stageHistory: [
        { stage: 'lead', at: NOW.toISOString() },
        { stage: 'won', at: NOW.toISOString() },
      ],
    }),
  )

  it('books the full value as revenue', () => {
    expect(won.dashboardRevenue).toBe(100_000)
  })

  it('empties the pipeline: a won deal is no longer in play', () => {
    expect(won.dashboardPipeline).toBe(0)
    expect(won.dashboardWeighted).toBe(0)
  })

  it('replaces the weighted contribution with the whole amount in the forecast', () => {
    // Before: counted at value x probability x health x timing. After: banked.
    expect(won.forecastValue).toBe(100_000)
    expect(won.forecastContribution).toBe(0)
  })

  it('moves the funnel cohort through to won', () => {
    const wonStage = won.analyticsFunnel.find((stage) => stage.stage === 'won')!
    expect(wonStage.entered).toBe(1)
  })

  it('credits the owning rep', () => {
    expect(won.teamRepA.revenue).toBe(100_000)
    expect(won.teamRepB.revenue).toBe(0)
  })

  it('says the same thing in the report as on the dashboard', () => {
    expect(won.reportRevenue).toBe(won.dashboardRevenue)
    expect(won.reportForecast).toBe(won.forecastValue)
  })
})

describe('moving the deal to lost', () => {
  const lost = screensFor(
    datasetWith({
      ...subject,
      stage: 'lost',
      probability: 0,
      closedAt: NOW.toISOString(),
    }),
  )

  it('books no revenue and clears the pipeline', () => {
    expect(lost.dashboardRevenue).toBe(0)
    expect(lost.dashboardPipeline).toBe(0)
  })

  it('leaves the forecast with nothing to project', () => {
    expect(lost.forecastValue).toBe(0)
  })
})

describe('moving the close date out of the period', () => {
  const later = screensFor(
    datasetWith({
      ...subject,
      expectedCloseDate: new Date(NOW.getTime() + 200 * 86_400_000).toISOString(),
    }),
  )

  it('drops it from the forecast but keeps it in the pipeline', () => {
    expect(later.forecastContribution).toBe(0)
    expect(later.dashboardPipeline).toBe(100_000)
  })
})
