/**
 * The workspace is the single source of truth configured during onboarding
 * and edited afterwards from Settings. Every feature module reads from it.
 */

export const WORKSPACE_SCHEMA_VERSION = 1

export interface DirectorProfile {
  firstName: string
  lastName: string
  jobTitle: string
}

export interface CompanyProfile {
  name: string
  sector: string
  /** ISO 3166-1 alpha-2 */
  country: string
  /** ISO 4217 */
  currency: string
  /** Optional square logo stored as a data URL (kept small on purpose). */
  logo: string | null
}

export interface SalesGoals {
  monthlyTarget: number
  annualTarget: number
}

export interface SalesRep {
  id: string
  name: string
  role: string
  /** Token index used for the deterministic avatar colour. */
  accent: number
  /**
   * Personal commitment. Null means "an equal share of the team target", which
   * is what every rep starts on until a quota is set for them.
   */
  monthlyTarget: number | null
  annualTarget: number | null
  region: string | null
  email: string | null
}

export type FiscalYearStart = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface Preferences {
  /** BCP 47 tag used for every number and date the app renders. */
  locale: string
  fiscalYearStart: FiscalYearStart
  weekStartsOn: 'monday' | 'sunday'
  /** Render large figures as 1.2M instead of 1,200,000. */
  compactNumbers: boolean
}

export interface Workspace {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  onboardingCompletedAt: string | null
  director: DirectorProfile
  company: CompanyProfile
  goals: SalesGoals
  team: SalesRep[]
  preferences: Preferences
}

/** Shape captured by the onboarding wizard before it becomes a Workspace. */
export interface OnboardingDraft {
  step: number
  director: DirectorProfile
  company: CompanyProfile
  goals: SalesGoals
  team: SalesRep[]
}

export type WorkspacePatch = {
  director?: Partial<DirectorProfile>
  company?: Partial<CompanyProfile>
  goals?: Partial<SalesGoals>
  team?: SalesRep[]
  preferences?: Partial<Preferences>
}

export function directorFullName(director: DirectorProfile): string {
  return [director.firstName, director.lastName].filter(Boolean).join(' ').trim()
}

export function directorInitials(director: DirectorProfile): string {
  const first = director.firstName.trim().charAt(0)
  const last = director.lastName.trim().charAt(0)
  return `${first}${last}`.toUpperCase() || 'CC'
}

export function repInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
