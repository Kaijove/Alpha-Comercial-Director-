import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { draftRepository } from '@/data/repository'
import { createEmptyDraft, isDraftMeaningful } from '@/domain/defaults'
import type {
  CompanyProfile,
  DirectorProfile,
  OnboardingDraft,
  SalesGoals,
  SalesRep,
} from '@/domain/workspace'
import {
  hasErrors,
  validateCompany,
  validateDirector,
  validateGoals,
  validateTeam,
  type FieldErrors,
} from '@/domain/validation'
import {
  ONBOARDING_STEPS,
  OnboardingContext,
  type OnboardingContextValue,
} from './onboardingContext'

/** Steps that gate progress. Welcome and review have nothing to validate. */
const VALIDATORS: Partial<Record<number, (draft: OnboardingDraft) => FieldErrors>> = {
  1: validateDirector,
  2: validateCompany,
  3: validateGoals,
  4: validateTeam,
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const restored = useRef<OnboardingDraft | null>(draftRepository.load())
  const [draft, setDraft] = useState<OnboardingDraft>(
    () => restored.current ?? createEmptyDraft(),
  )
  const [step, setStep] = useState<number>(() => {
    const saved = restored.current?.step ?? 0
    return Math.min(Math.max(saved, 0), ONBOARDING_STEPS.length - 1)
  })
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [errors, setErrors] = useState<FieldErrors>({})

  /** Autosave: a refresh mid-onboarding must never lose typed answers. */
  useEffect(() => {
    if (step === 0 && !isDraftMeaningful(draft)) {
      // Nothing typed yet - don't leave a phantom draft behind.
      draftRepository.clear()
      return
    }
    draftRepository.save({ ...draft, step })
  }, [draft, step])

  const setDirector = useCallback((patch: Partial<DirectorProfile>) => {
    setDraft((current) => ({ ...current, director: { ...current.director, ...patch } }))
  }, [])

  const setCompany = useCallback((patch: Partial<CompanyProfile>) => {
    setDraft((current) => ({ ...current, company: { ...current.company, ...patch } }))
  }, [])

  const setGoals = useCallback((patch: Partial<SalesGoals>) => {
    setDraft((current) => ({ ...current, goals: { ...current.goals, ...patch } }))
  }, [])

  const setTeam = useCallback((team: SalesRep[]) => {
    setDraft((current) => ({ ...current, team }))
  }, [])

  const clearError = useCallback((field: string) => {
    setErrors((current) => {
      if (!(field in current)) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const next = useCallback(() => {
    const validate = VALIDATORS[step]
    const found = validate ? validate(draft) : {}
    setErrors(found)
    if (hasErrors(found)) return false
    setDirection('forward')
    setStep((current) => Math.min(current + 1, ONBOARDING_STEPS.length - 1))
    return true
  }, [draft, step])

  const back = useCallback(() => {
    setErrors({})
    setDirection('back')
    setStep((current) => Math.max(current - 1, 0))
  }, [])

  const goTo = useCallback(
    (target: number) => {
      setErrors({})
      setDirection(target > step ? 'forward' : 'back')
      setStep(Math.min(Math.max(target, 0), ONBOARDING_STEPS.length - 1))
    },
    [step],
  )

  const reset = useCallback(() => {
    draftRepository.clear()
    restored.current = null
    setDraft(createEmptyDraft())
    setErrors({})
    setDirection('back')
    setStep(0)
  }, [])

  const value = useMemo<OnboardingContextValue>(
    () => ({
      draft,
      step,
      direction,
      errors,
      totalSteps: ONBOARDING_STEPS.length,
      resumed: Boolean(
        restored.current &&
          (restored.current.step > 0 || isDraftMeaningful(restored.current)),
      ),
      setDirector,
      setCompany,
      setGoals,
      setTeam,
      next,
      back,
      goTo,
      clearError,
      reset,
    }),
    [
      draft,
      step,
      direction,
      errors,
      setDirector,
      setCompany,
      setGoals,
      setTeam,
      next,
      back,
      goTo,
      clearError,
      reset,
    ],
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}
