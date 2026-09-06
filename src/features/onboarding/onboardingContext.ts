import { createContext, useContext } from 'react'
import type {
  CompanyProfile,
  DirectorProfile,
  OnboardingDraft,
  SalesGoals,
  SalesRep,
} from '@/domain/workspace'
import type { FieldErrors } from '@/domain/validation'

export const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'about', label: 'About you' },
  { id: 'company', label: 'Company' },
  { id: 'goals', label: 'Sales goals' },
  { id: 'team', label: 'Sales team' },
  { id: 'review', label: 'Final review' },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

export interface OnboardingContextValue {
  draft: OnboardingDraft
  step: number
  direction: 'forward' | 'back'
  errors: FieldErrors
  totalSteps: number
  resumed: boolean
  setDirector: (patch: Partial<DirectorProfile>) => void
  setCompany: (patch: Partial<CompanyProfile>) => void
  setGoals: (patch: Partial<SalesGoals>) => void
  setTeam: (team: SalesRep[]) => void
  next: () => boolean
  back: () => void
  goTo: (step: number) => void
  clearError: (field: string) => void
  reset: () => void
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used inside <OnboardingProvider>.')
  }
  return context
}
