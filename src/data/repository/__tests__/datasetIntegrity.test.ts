import { beforeEach, describe, expect, it } from 'vitest'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod } from '@/domain/metrics/periods'
import { makeWorkspace, NOW } from '@/domain/intelligence/__tests__/factories'
import { GENERATOR_VERSION } from '@/data/seed/generateCommercialData'
import { normaliseDataset } from '../migrations'
import { COMMERCIAL_KEY, localCommercialRepository } from '../commercialRepository'
import { writeRaw } from '@/lib/storage'

/**
 * Storage is the boundary where untrusted JSON becomes a domain object.
 *
 * These tests exist because it once was not: the repository checked that
 * `opportunities` was an array and passed whatever was inside it to the engines,
 * which turned a stored `value: "hello"` into a revenue of `"0hello"` and a
 * stored `probability: 999` into 9,990,000 of weighted pipeline on the
 * dashboard. Broken figures that look like figures are worse than a crash.
 */
const period = resolvePeriod('mtd', NOW)
const workspace = makeWorkspace()

const owner = { id: 'o1', name: 'Rep One', role: 'AE', accent: 0 }
const customer = {
  id: 'c1',
  name: 'Account One',
  industry: 'Industry',
  region: 'Region',
  createdAt: NOW.toISOString(),
}

const deal = (overrides: Record<string, unknown> = {}) => ({
  id: 'd1',
  name: 'Deal',
  customerId: 'c1',
  ownerId: 'o1',
  stage: 'proposal',
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
  stageHistory: [{ stage: 'lead', at: NOW.toISOString() }],
  stageEnteredAt: NOW.toISOString(),
  ...overrides,
})

const stored = (dataset: Record<string, unknown>) => ({
  generatorVersion: GENERATOR_VERSION,
  seed: 1,
  generatedAt: NOW.toISOString(),
  owners: [owner],
  customers: [customer],
  activities: [],
  opportunities: [],
  ...dataset,
})

describe('field coercion', () => {
  it('drops a value that is not a number instead of concatenating it', () => {
    const result = normaliseDataset(stored({ opportunities: [deal({ value: 'hello' })] }))
    expect(result?.opportunities[0].value).toBe(0)
  })

  it('clamps a negative value to zero', () => {
    const result = normaliseDataset(stored({ opportunities: [deal({ value: -5_000 })] }))
    expect(result?.opportunities[0].value).toBe(0)
  })

  it('rejects a probability above 1 and falls back to the stage default', () => {
    const result = normaliseDataset(stored({ opportunities: [deal({ probability: 999 })] }))
    expect(result?.opportunities[0].probability).toBe(0.5)
  })

  it('rejects a negative probability', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ probability: -50, stage: 'lead' })] }),
    )
    expect(result?.opportunities[0].probability).toBe(0.1)
  })

  it('replaces an unparseable date rather than carrying NaN into the engines', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ expectedCloseDate: 'not-a-date' })] }),
    )
    const close = result?.opportunities[0].expectedCloseDate as string
    expect(Number.isNaN(Date.parse(close))).toBe(false)
  })

  it('falls back to a known stage when the stored one is unrecognised', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ stage: 'archived' })] }),
    )
    expect(result?.opportunities[0].stage).toBe('lead')
  })

  it('gives a won deal a close date so revenue can find it', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ stage: 'won', closedAt: null })] }),
    )
    expect(result?.opportunities[0].closedAt).not.toBeNull()
  })

  it('clears the close date on an open deal so it is not counted as closed', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ stage: 'proposal', closedAt: NOW.toISOString() })] }),
    )
    expect(result?.opportunities[0].closedAt).toBeNull()
  })
})

describe('relationship integrity', () => {
  it('keeps a deal owned by a rep added after the dataset was generated', () => {
    // The stored roster is deliberately stale - the live one comes from
    // `workspace.team` - so an unresolvable owner is normal, not corruption.
    // Dropping these would silently delete the deals of every rep added in
    // Settings the next time the app loaded.
    const result = normaliseDataset(
      stored({ opportunities: [deal({ ownerId: 'rep-added-in-settings' })] }),
    )
    expect(result?.opportunities).toHaveLength(1)
    expect(result?.opportunities[0].ownerId).toBe('rep-added-in-settings')
  })

  it('keeps a deal whose customer is not in the stored list', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ customerId: 'later-account' })] }),
    )
    expect(result?.opportunities).toHaveLength(1)
  })

  it('drops a deal with no owner or customer at all', () => {
    expect(
      normaliseDataset(stored({ opportunities: [deal({ ownerId: '' })] }))?.opportunities,
    ).toHaveLength(0)
    expect(
      normaliseDataset(stored({ opportunities: [deal({ customerId: null })] }))?.opportunities,
    ).toHaveLength(0)
  })

  it('drops a record with no id', () => {
    const result = normaliseDataset(stored({ opportunities: [deal({ id: '' })] }))
    expect(result?.opportunities).toHaveLength(0)
  })

  it('keeps only the first of two records sharing an id', () => {
    const result = normaliseDataset(
      stored({
        opportunities: [deal({ value: 10_000 }), deal({ value: 99_000 })],
      }),
    )
    expect(result?.opportunities).toHaveLength(1)
    expect(result?.opportunities[0].value).toBe(10_000)
  })

  it('drops duplicate owners so revenue cannot be double counted', () => {
    const result = normaliseDataset(stored({ owners: [owner, { ...owner, name: 'Clone' }] }))
    expect(result?.owners).toHaveLength(1)
  })

  it('drops an activity that names no opportunity or owner', () => {
    const result = normaliseDataset(
      stored({
        opportunities: [deal()],
        activities: [
          { id: 'a1', opportunityId: 'd1', ownerId: 'o1', type: 'call', at: NOW.toISOString(), summary: '' },
          { id: 'a2', opportunityId: '', ownerId: 'o1', type: 'call', at: NOW.toISOString(), summary: '' },
          { id: 'a3', opportunityId: 'd1', ownerId: null, type: 'call', at: NOW.toISOString(), summary: '' },
        ],
      }),
    )
    expect(result?.activities).toHaveLength(1)
  })

  it('normalises an unknown activity type rather than dropping the record', () => {
    const result = normaliseDataset(
      stored({
        opportunities: [deal()],
        activities: [
          { id: 'a1', opportunityId: 'd1', ownerId: 'o1', type: 'telepathy', at: NOW.toISOString(), summary: '' },
        ],
      }),
    )
    expect(result?.activities[0].type).toBe('note')
  })
})

describe('structural damage', () => {
  it('survives missing arrays', () => {
    const result = normaliseDataset({
      generatorVersion: GENERATOR_VERSION,
      owners: [owner],
      customers: [customer],
    })
    expect(result?.opportunities).toEqual([])
    expect(result?.activities).toEqual([])
  })

  it('survives arrays holding nulls and primitives', () => {
    const result = normaliseDataset(
      stored({ opportunities: [null, 42, 'x', deal()], owners: [owner, null, 7] }),
    )
    expect(result?.opportunities).toHaveLength(1)
    expect(result?.owners).toHaveLength(1)
  })

  it('rebuilds a stage history so the funnel is not silently zeroed', () => {
    const result = normaliseDataset(
      stored({ opportunities: [deal({ stageHistory: 'nonsense' })] }),
    )
    expect(result?.opportunities[0].stageHistory.length).toBeGreaterThan(0)
  })

  it('gives up rather than returning a spine with no owners or customers', () => {
    expect(normaliseDataset(stored({ owners: [] }))).toBeNull()
    expect(normaliseDataset(stored({ customers: [] }))).toBeNull()
    expect(normaliseDataset(null)).toBeNull()
    expect(normaliseDataset('nonsense')).toBeNull()
  })
})

describe('the engines never see corruption', () => {
  const hostile = stored({
    opportunities: [
      deal({ id: 'a', value: 'hello', stage: 'won', closedAt: NOW.toISOString() }),
      deal({ id: 'b', probability: 999 }),
      deal({ id: 'c', value: -5_000, probability: -50, expectedCloseDate: 'not-a-date' }),
      deal({ id: 'd', ownerId: 'ghost' }),
    ],
  })

  it('produces finite figures across the whole metrics snapshot', () => {
    const dataset = normaliseDataset(hostile)!
    const metrics = computeCommercialMetrics(dataset, workspace, period, null)

    const figures = {
      revenue: metrics.revenue,
      target: metrics.target,
      pipelineTotal: metrics.pipelineTotal,
      weightedPipeline: metrics.weightedPipeline,
      forecast: metrics.forecast.value,
      forecastGap: metrics.forecast.gap,
      confidence: metrics.forecast.confidence.score,
      probability: metrics.forecast.probability.score,
    }

    for (const [name, value] of Object.entries(figures)) {
      expect(typeof value, `${name} should be a number, got ${typeof value}`).toBe('number')
      expect(Number.isFinite(value), `${name} = ${value}`).toBe(true)
    }
  })

  it('keeps the weighted pipeline at or below the face value', () => {
    const dataset = normaliseDataset(hostile)!
    const metrics = computeCommercialMetrics(dataset, workspace, period, null)
    expect(metrics.weightedPipeline).toBeLessThanOrEqual(metrics.pipelineTotal)
  })

  it('never reports negative pipeline or revenue', () => {
    const dataset = normaliseDataset(hostile)!
    const metrics = computeCommercialMetrics(dataset, workspace, period, null)
    expect(metrics.revenue).toBeGreaterThanOrEqual(0)
    expect(metrics.pipelineTotal).toBeGreaterThanOrEqual(0)
  })
})

describe('the repository applies it', () => {
  beforeEach(() => {
    localCommercialRepository.clear()
  })

  it('normalises what it loads', () => {
    writeRaw(
      COMMERCIAL_KEY,
      JSON.stringify({
        baseKey: 'k',
        dataset: stored({ opportunities: [deal({ probability: 999 })] }),
      }),
    )
    const loaded = localCommercialRepository.load('k')
    expect(loaded?.opportunities[0].probability).toBe(0.5)
  })

  it('returns null for a dataset beyond repair', () => {
    writeRaw(COMMERCIAL_KEY, JSON.stringify({ baseKey: 'k', dataset: { owners: 'no' } }))
    expect(localCommercialRepository.load('k')).toBeNull()
  })

  it('returns null when the stored copy belongs to another workspace', () => {
    writeRaw(COMMERCIAL_KEY, JSON.stringify({ baseKey: 'other', dataset: stored({}) }))
    expect(localCommercialRepository.load('k')).toBeNull()
  })
})
