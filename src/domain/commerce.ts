/**
 * Commercial domain model.
 *
 * Everything the command center analyses lives here: customers, opportunities
 * and activities. Relations are expressed with ids, never by copying records,
 * so a rename in one place is reflected everywhere.
 */

export const STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const

export type Stage = (typeof STAGES)[number]

/** The stages an open deal moves through, in order. */
export const OPEN_STAGES: Stage[] = ['lead', 'qualified', 'proposal', 'negotiation']

/** The funnel, ending in the outcome that matters. */
export const FUNNEL_STAGES: Stage[] = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
]

export const STAGE_LABELS: Record<Stage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

/** Defaults applied when a deal enters a stage; a manual value always wins. */
export const STAGE_DEFAULT_PROBABILITY: Record<Stage, number> = {
  lead: 0.1,
  qualified: 0.25,
  proposal: 0.5,
  negotiation: 0.75,
  won: 1,
  lost: 0,
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'proposal' | 'follow-up' | 'note'

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  proposal: 'Proposal sent',
  'follow-up': 'Follow-up',
  note: 'Note',
}

/**
 * A stage the opportunity entered, and when.
 *
 * Without this, stage-to-stage conversion cannot be derived from the data - it
 * would have to be guessed from the deals that happen to be sitting in each
 * stage today, which is a snapshot, not a flow.
 */
export interface StageEvent {
  stage: Stage
  at: string
}

export interface Customer {
  id: string
  name: string
  industry: string
  region: string
  createdAt: string
}

export interface Opportunity {
  id: string
  name: string
  customerId: string
  ownerId: string
  stage: Stage
  value: number
  /** 0..1. Seeded from the stage default, then adjusted per deal. */
  probability: number
  /**
   * True once someone has set the probability by hand. A stage change then
   * leaves it alone instead of snapping it back to the stage default.
   */
  probabilityIsManual: boolean
  expectedCloseDate: string
  createdAt: string
  updatedAt: string
  lastActivityAt: string
  /** Set only for won/lost deals. */
  closedAt: string | null
  product: string
  source: string
  region: string
  notes: string
  /** Ordered, oldest first. Always starts at `lead`. */
  stageHistory: StageEvent[]
  /** When the deal entered the stage it is in now. */
  stageEnteredAt: string
}

export interface Activity {
  id: string
  opportunityId: string
  ownerId: string
  type: ActivityType
  at: string
  summary: string
}

/** A sales rep as the analytics layer sees them, resolved from the workspace. */
export interface Owner {
  id: string
  name: string
  role: string
  accent: number
}

export interface CommercialDataset {
  /** Bumped when the generator changes shape, so caches can be invalidated. */
  generatorVersion: number
  seed: number
  generatedAt: string
  owners: Owner[]
  customers: Customer[]
  opportunities: Opportunity[]
  activities: Activity[]
}

/** Id used when a director has no roster and owns everything themselves. */
export const SOLO_OWNER_ID = 'owner_director'

export const isOpen = (opportunity: Opportunity): boolean =>
  opportunity.stage !== 'won' && opportunity.stage !== 'lost'

export const isWon = (opportunity: Opportunity): boolean => opportunity.stage === 'won'

export const isLost = (opportunity: Opportunity): boolean => opportunity.stage === 'lost'

/** Days between a past ISO timestamp and the reference date. */
export function daysSince(iso: string, reference: Date): number {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 0
  // An elapsed duration is never negative.
  //
  // `reference` is pinned when a screen mounts, so a deal created or moved a
  // moment later carries a timestamp *after* it. `Math.floor` of a small
  // negative gives -1, which surfaced as "-1 days in this stage" on a deal the
  // director had just created. The intelligence and risk engines each wrapped
  // this call in their own `Math.max(0, ...)`; four other call sites did not.
  // Clamping belongs to the function, not to whoever remembers.
  return Math.max(0, Math.floor((reference.getTime() - then) / 86_400_000))
}

/** The furthest stage an opportunity reached, from its history. */
export function furthestStage(opportunity: Opportunity): Stage {
  const last = opportunity.stageHistory[opportunity.stageHistory.length - 1]
  return last ? last.stage : opportunity.stage
}

/** Days from the reference date until an ISO date (negative when overdue). */
export function daysUntil(iso: string, reference: Date): number {
  const target = Date.parse(iso)
  if (Number.isNaN(target)) return 0
  // Deliberately signed, unlike `daysSince`: a negative here means the date has
  // passed, and both the forecast timing factor and the overdue rules read it.
  return Math.ceil((target - reference.getTime()) / 86_400_000)
}
