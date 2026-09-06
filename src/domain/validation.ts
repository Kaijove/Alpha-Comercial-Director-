import type { OnboardingDraft } from './workspace'

export type FieldErrors = Record<string, string>

const trim = (value: string) => value.trim()

export function validateDirector(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (trim(draft.director.firstName).length < 2) {
    errors.firstName = 'Please enter your first name.'
  }
  if (trim(draft.director.lastName).length < 2) {
    errors.lastName = 'Please enter your last name.'
  }
  if (trim(draft.director.jobTitle).length < 2) {
    errors.jobTitle = 'Please enter your job title.'
  }
  return errors
}

export function validateCompany(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (trim(draft.company.name).length < 2) {
    errors.name = 'Please enter your company name.'
  }
  if (!draft.company.sector) {
    errors.sector = 'Select the sector you operate in.'
  }
  if (!draft.company.country) {
    errors.country = 'Select your country.'
  }
  if (!draft.company.currency) {
    errors.currency = 'Select the currency you report in.'
  }
  return errors
}

export function validateGoals(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  if (!draft.goals.monthlyTarget || draft.goals.monthlyTarget <= 0) {
    errors.monthlyTarget = 'Set a monthly target above zero.'
  }
  if (!draft.goals.annualTarget || draft.goals.annualTarget <= 0) {
    errors.annualTarget = 'Set an annual target above zero.'
  }
  if (
    draft.goals.monthlyTarget > 0 &&
    draft.goals.annualTarget > 0 &&
    draft.goals.annualTarget < draft.goals.monthlyTarget
  ) {
    errors.annualTarget = 'The annual target cannot be lower than the monthly one.'
  }
  return errors
}

/** The team step is skippable — only rows that were started must be valid. */
export function validateTeam(draft: OnboardingDraft): FieldErrors {
  const errors: FieldErrors = {}
  draft.team.forEach((rep, index) => {
    if (rep.name.trim().length === 0 && rep.role.trim().length > 0) {
      errors[`team.${index}`] = 'Add a name for this rep, or remove the row.'
    }
    if (rep.name.trim().length === 1) {
      errors[`team.${index}`] = 'That name looks too short.'
    }
  })
  return errors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
