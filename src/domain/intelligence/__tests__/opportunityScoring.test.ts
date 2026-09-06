import { describe, expect, it } from 'vitest'
import { assessOpportunityHealth, scoreOpportunity, scorePipeline } from '../opportunityScoring'
import { INTELLIGENCE_THRESHOLDS as T } from '../thresholds'
import { NOW, activities, makeOpportunity } from './factories'

const context = (overrides: Partial<Parameters<typeof assessOpportunityHealth>[1]> = {}) => ({
  now: NOW,
  activities: activities(3),
  averageOpenValue: 100_000,
  ...overrides,
})

describe('opportunity health', () => {
  it('leaves a well-worked, on-schedule deal in the healthy band', () => {
    const health = assessOpportunityHealth(makeOpportunity(), context())
    expect(health.band).toBe('healthy')
    expect(health.score).toBeGreaterThanOrEqual(T.health.healthy)
  })

  it('never leaves the 0-100 range, however bad the deal is', () => {
    const health = assessOpportunityHealth(
      makeOpportunity({
        stage: 'lead',
        probability: 0.05,
        expectedCloseDate: new Date(NOW.getTime() - 90 * 86_400_000).toISOString(),
        lastActivityAt: new Date(NOW.getTime() - 400 * 86_400_000).toISOString(),
        stageHistory: [{ stage: 'lead', at: '2024-01-01T00:00:00.000Z' }],
      }),
      context({ activities: [] }),
    )
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
    expect(health.band).toBe('critical')
  })
})

describe('stalled detection', () => {
  const silentFor = (days: number, extra: Parameters<typeof makeOpportunity>[0] = {}) =>
    makeOpportunity({
      lastActivityAt: new Date(NOW.getTime() - days * 86_400_000).toISOString(),
      ...extra,
    })

  it('does not flag a deal one day short of the threshold', () => {
    const health = assessOpportunityHealth(silentFor(T.stalledDays - 1), context())
    expect(health.inactiveDays).toBe(T.stalledDays - 1)
    expect(health.factors.some((f) => f.startsWith('No activity for'))).toBe(false)
  })

  it('flags a deal exactly on the threshold', () => {
    const health = assessOpportunityHealth(silentFor(T.stalledDays), context())
    expect(health.inactiveDays).toBe(T.stalledDays)
    expect(health.factors).toContain(`No activity for ${T.stalledDays} days`)
  })

  it('punishes silence harder when the close date is imminent', () => {
    const farOut = assessOpportunityHealth(
      silentFor(20, { expectedCloseDate: new Date(NOW.getTime() + 80 * 86_400_000).toISOString() }),
      context(),
    )
    const imminent = assessOpportunityHealth(
      silentFor(20, { expectedCloseDate: new Date(NOW.getTime() + 5 * 86_400_000).toISOString() }),
      context(),
    )
    expect(imminent.score).toBeLessThan(farOut.score)
  })

  it('does not let a history of contact cancel out current silence', () => {
    // Six logged activities earn a bonus only while the deal is still being
    // worked; once it goes quiet the bonus must not mask the silence.
    const quiet = assessOpportunityHealth(silentFor(20), context({ activities: activities(8) }))
    expect(quiet.band).not.toBe('healthy')
  })

  it('takes a stalled deal out of the healthy band', () => {
    const health = assessOpportunityHealth(silentFor(T.stalledDays + 5), context())
    expect(health.band).not.toBe('healthy')
  })
})

describe('opportunity priority score', () => {
  it('is not weighted value: two deals of equal value x probability can differ', () => {
    const soon = makeOpportunity({
      value: 100_000,
      probability: 0.5,
      expectedCloseDate: new Date(NOW.getTime() + 5 * 86_400_000).toISOString(),
    })
    const later = makeOpportunity({
      id: 'opp_2',
      value: 100_000,
      probability: 0.5,
      expectedCloseDate: new Date(NOW.getTime() + 120 * 86_400_000).toISOString(),
    })
    const scoreOf = (o: typeof soon) =>
      scoreOpportunity(o, assessOpportunityHealth(o, context()), context())

    expect(soon.value * soon.probability).toBe(later.value * later.probability)
    expect(scoreOf(soon)).toBeGreaterThan(scoreOf(later))
  })

  it('ranks a bigger deal above a smaller one, all else equal', () => {
    const big = makeOpportunity({ value: 300_000 })
    const small = makeOpportunity({ id: 'opp_2', value: 20_000 })
    const scoreOf = (o: typeof big) =>
      scoreOpportunity(o, assessOpportunityHealth(o, context()), context())
    expect(scoreOf(big)).toBeGreaterThan(scoreOf(small))
  })
})

describe('scorePipeline', () => {
  it('scores open deals only', () => {
    const scored = scorePipeline(
      [
        makeOpportunity({ id: 'a', stage: 'proposal' }),
        makeOpportunity({ id: 'b', stage: 'won' }),
        makeOpportunity({ id: 'c', stage: 'lost' }),
      ],
      () => activities(2),
      NOW,
    )
    expect(scored.map((entry) => entry.opportunity.id)).toEqual(['a'])
  })

  it('is deterministic: the same input scores the same twice', () => {
    const opportunities = [makeOpportunity({ id: 'a' }), makeOpportunity({ id: 'b' })]
    const run = () => scorePipeline(opportunities, () => activities(2), NOW).map((e) => e.score)
    expect(run()).toEqual(run())
  })
})
