import { createId } from '@/lib/id'
import {
  WORKSPACE_SCHEMA_VERSION,
  type OnboardingDraft,
  type Preferences,
  type SalesRep,
  type Workspace,
} from './workspace'

export const DEFAULT_PREFERENCES: Preferences = {
  locale: 'en-US',
  fiscalYearStart: 1,
  weekStartsOn: 'monday',
  compactNumbers: true,
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    step: 0,
    director: { firstName: '', lastName: '', jobTitle: '' },
    company: { name: '', sector: '', country: '', currency: '', logo: null },
    goals: { monthlyTarget: 0, annualTarget: 0 },
    team: [],
  }
}

export function createRep(name = '', role = '', accent?: number): SalesRep {
  return {
    id: createId('rep'),
    name,
    role,
    accent: accent ?? Math.floor(Math.random() * 8),
    monthlyTarget: null,
    annualTarget: null,
    region: null,
    email: null,
  }
}

/**
 * True when the director actually put something into the wizard. Used to tell a
 * genuine "resume where you left off" apart from an untouched first visit.
 */
export function isDraftMeaningful(draft: OnboardingDraft): boolean {
  const { director, company, goals, team } = draft
  return Boolean(
    director.firstName.trim() ||
      director.lastName.trim() ||
      director.jobTitle.trim() ||
      company.name.trim() ||
      company.sector ||
      company.country ||
      company.currency ||
      company.logo ||
      goals.monthlyTarget > 0 ||
      goals.annualTarget > 0 ||
      team.length > 0,
  )
}

/** Promote a completed onboarding draft into the persisted workspace. */
export function workspaceFromDraft(
  draft: OnboardingDraft,
  preferences: Preferences = DEFAULT_PREFERENCES,
): Workspace {
  const now = new Date().toISOString()
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    onboardingCompletedAt: now,
    director: { ...draft.director },
    company: { ...draft.company },
    goals: { ...draft.goals },
    team: draft.team.filter((rep) => rep.name.trim().length > 0),
    preferences,
  }
}
