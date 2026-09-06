import type { Activity, Opportunity, Stage } from '@/domain/commerce'
import { DEFAULT_PREFERENCES } from '@/domain/defaults'
import { WORKSPACE_SCHEMA_VERSION, type Workspace } from '@/domain/workspace'
import type { IntelligenceFormatters } from '../context'

/**
 * Fixtures for the intelligence tests.
 *
 * Deliberately hand-built rather than generated: a test that asserts "a deal
 * silent for twenty days is not healthy" has to control the silence, and the
 * seeded generator is the wrong tool for that.
 */
export const NOW = new Date('2026-06-15T12:00:00.000Z')

const daysFromNow = (days: number, from: Date = NOW) =>
  new Date(from.getTime() + days * 86_400_000).toISOString()

export function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const stage: Stage = overrides.stage ?? 'proposal'
  return {
    id: 'opp_1',
    name: 'Test deal',
    customerId: 'cus_1',
    ownerId: 'own_1',
    stage,
    value: 100_000,
    probability: 0.5,
    probabilityIsManual: false,
    expectedCloseDate: daysFromNow(30),
    createdAt: daysFromNow(-90),
    updatedAt: daysFromNow(-1),
    lastActivityAt: daysFromNow(-1),
    closedAt: null,
    product: 'Boiler retrofit',
    source: 'Inbound',
    region: 'Catalunya',
    notes: '',
    stageHistory: [
      { stage: 'lead', at: daysFromNow(-90) },
      { stage, at: daysFromNow(-20) },
    ],
    stageEnteredAt: daysFromNow(-20),
    ...overrides,
  }
}

export function makeActivity(index: number, opportunityId = 'opp_1'): Activity {
  return {
    id: `act_${index}`,
    opportunityId,
    ownerId: 'own_1',
    type: 'call',
    at: daysFromNow(-index - 1),
    summary: 'Follow-up',
  }
}

/** `count` activities attached to the same deal. */
export const activities = (count: number, opportunityId = 'opp_1') =>
  Array.from({ length: count }, (_, index) => makeActivity(index, opportunityId))

export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: '2024-01-08T09:00:00.000Z',
    updatedAt: '2024-01-08T09:00:00.000Z',
    onboardingCompletedAt: '2024-01-08T09:00:00.000Z',
    director: { firstName: 'Nuria', lastName: 'Vidal', jobTitle: 'Sales Director' },
    company: {
      name: 'Termoclima Industrial',
      sector: 'Industrial equipment',
      country: 'ES',
      currency: 'EUR',
      logo: null,
    },
    goals: { monthlyTarget: 500_000, annualTarget: 6_000_000 },
    team: [
      makeRep('rep_1', 'Laia Puig'),
      makeRep('rep_2', 'Marc Soler'),
      makeRep('rep_3', 'Anna Ferrer'),
      makeRep('rep_4', 'Pau Bosch'),
    ],
    preferences: DEFAULT_PREFERENCES,
    ...overrides,
  }
}

function makeRep(id: string, name: string) {
  return {
    id,
    name,
    role: 'Account Executive',
    accent: 0,
    monthlyTarget: null,
    annualTarget: null,
    region: null,
    email: null,
  }
}

/**
 * Formatters with no locale dependency, so an assertion on rule output never
 * fails because a runtime changed how it groups thousands.
 */
export const testFormatters: IntelligenceFormatters = {
  currency: (value) => `${Math.round(value)} EUR`,
  percent: (value, digits = 0) => `${(value * 100).toFixed(digits)}%`,
  points: (value, digits = 0) => `${(value * 100).toFixed(digits)} pts`,
  number: (value, digits = 0) => value.toFixed(digits),
  date: (value) => new Date(value).toISOString().slice(0, 10),
  shortDate: (value) => new Date(value).toISOString().slice(5, 10),
}
