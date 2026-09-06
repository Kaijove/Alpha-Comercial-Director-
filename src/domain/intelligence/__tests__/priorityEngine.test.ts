import { describe, expect, it } from 'vitest'
import { finalise, scoreInsight, severityFor } from '../priorityEngine'
import { INTELLIGENCE_THRESHOLDS as T } from '../thresholds'
import type { InsightDraft } from '../types'

const TARGET = 500_000

const draft = (overrides: Partial<InsightDraft> = {}): InsightDraft => ({
  id: 'test.draft',
  type: 'risk',
  category: 'revenue',
  title: 'Something needs attention',
  description: 'Detail',
  entityType: 'pipeline',
  entityId: null,
  entityName: null,
  impact: 50_000,
  reason: 'Because',
  triggers: ['A trigger'],
  evidence: [],
  recommendation: 'Do the thing',
  action: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  confidence: 0.8,
  daysUntil: 15,
  ...overrides,
})

describe('priority scoring', () => {
  it('is deterministic for identical drafts', () => {
    expect(scoreInsight(draft(), TARGET)).toBe(scoreInsight(draft(), TARGET))
  })

  it('stays inside 0-100 at both extremes', () => {
    const high = scoreInsight(
      draft({ impact: 10_000_000, daysUntil: -5, confidence: 1, category: 'revenue' }),
      TARGET,
    )
    const low = scoreInsight(
      draft({ impact: 0, daysUntil: 365, confidence: 0, category: 'activity' }),
      TARGET,
    )
    expect(high).toBeLessThanOrEqual(100)
    expect(low).toBeGreaterThanOrEqual(0)
    expect(high).toBeGreaterThan(low)
  })

  it('measures impact against the period target, not in absolute money', () => {
    // The same 50k matters more to a team carrying 200k than to one carrying 2M.
    expect(scoreInsight(draft({ impact: 50_000 }), 200_000)).toBeGreaterThan(
      scoreInsight(draft({ impact: 50_000 }), 2_000_000),
    )
  })

  it('ranks an overdue item above a distant one, all else equal', () => {
    expect(scoreInsight(draft({ daysUntil: -1 }), TARGET)).toBeGreaterThan(
      scoreInsight(draft({ daysUntil: 90 }), TARGET),
    )
  })

  it('ranks a revenue signal above an activity signal, all else equal', () => {
    expect(scoreInsight(draft({ category: 'revenue' }), TARGET)).toBeGreaterThan(
      scoreInsight(draft({ category: 'activity' }), TARGET),
    )
  })

  it('rewards confidence', () => {
    expect(scoreInsight(draft({ confidence: 0.95 }), TARGET)).toBeGreaterThan(
      scoreInsight(draft({ confidence: 0.4 }), TARGET),
    )
  })
})

describe('severity bands', () => {
  it('maps scores onto the configured bands', () => {
    expect(severityFor(T.priority.critical, false)).toBe('critical')
    expect(severityFor(T.priority.critical - 1, false)).toBe('high')
    expect(severityFor(T.priority.high - 1, false)).toBe('medium')
    expect(severityFor(T.priority.medium - 1, false)).toBe('low')
  })

  it('routes anything positive to the positive band whatever it scores', () => {
    expect(severityFor(99, true)).toBe('positive')
    expect(severityFor(1, true)).toBe('positive')
  })
})

describe('finalise', () => {
  it('produces a new insight carrying its own score and severity', () => {
    const insight = finalise(draft(), TARGET)
    expect(insight.status).toBe('new')
    expect(insight.priorityScore).toBe(scoreInsight(draft(), TARGET))
    expect(insight.severity).toBe(severityFor(insight.priorityScore, false))
  })

  it('keeps the id the rule assigned, so status survives a regeneration', () => {
    expect(finalise(draft({ id: 'risk.pipeline-gap' }), TARGET).id).toBe('risk.pipeline-gap')
  })
})
