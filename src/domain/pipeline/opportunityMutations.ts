import {
  STAGE_DEFAULT_PROBABILITY,
  type Activity,
  type Opportunity,
  type Stage,
} from '@/domain/commerce'
import { createId } from '@/lib/id'
import { toIso } from '@/lib/dates'

/**
 * Pure transformations on an opportunity.
 *
 * Kept out of the provider and out of components so the rules that matter -
 * how a stage change touches probability, what a move records in the history -
 * live in one place and can be reasoned about on their own.
 */

export interface OpportunityDraft {
  name: string
  customerId: string
  ownerId: string
  stage: Stage
  value: number
  probability: number
  probabilityIsManual: boolean
  expectedCloseDate: string
  product: string
  source: string
  notes: string
}

export function draftFromOpportunity(opportunity: Opportunity): OpportunityDraft {
  return {
    name: opportunity.name,
    customerId: opportunity.customerId,
    ownerId: opportunity.ownerId,
    stage: opportunity.stage,
    value: opportunity.value,
    probability: opportunity.probability,
    probabilityIsManual: opportunity.probabilityIsManual,
    expectedCloseDate: opportunity.expectedCloseDate.slice(0, 10),
    product: opportunity.product,
    source: opportunity.source,
    notes: opportunity.notes,
  }
}

export function emptyDraft(defaults: {
  ownerId: string
  customerId: string
  product: string
  source: string
  expectedCloseDate: string
}): OpportunityDraft {
  return {
    name: '',
    customerId: defaults.customerId,
    ownerId: defaults.ownerId,
    stage: 'lead',
    value: 0,
    probability: STAGE_DEFAULT_PROBABILITY.lead,
    probabilityIsManual: false,
    expectedCloseDate: defaults.expectedCloseDate,
    product: defaults.product,
    source: defaults.source,
    notes: '',
  }
}

/** Builds a brand new opportunity from a form draft. */
export function buildOpportunity(
  draft: OpportunityDraft,
  region: string,
  now: Date,
): Opportunity {
  const iso = toIso(now)
  return {
    id: createId('opp'),
    name: draft.name.trim(),
    customerId: draft.customerId,
    ownerId: draft.ownerId,
    stage: draft.stage,
    value: draft.value,
    probability: draft.probability,
    probabilityIsManual: draft.probabilityIsManual,
    expectedCloseDate: new Date(`${draft.expectedCloseDate}T12:00:00`).toISOString(),
    createdAt: iso,
    updatedAt: iso,
    lastActivityAt: iso,
    closedAt: draft.stage === 'won' || draft.stage === 'lost' ? iso : null,
    product: draft.product,
    source: draft.source,
    region,
    notes: draft.notes,
    stageHistory: [{ stage: draft.stage, at: iso }],
    stageEnteredAt: iso,
  }
}

/**
 * Moves a deal to another stage.
 *
 * The probability follows the stage default *unless* somebody set it by hand -
 * a manual figure is the director's judgement and must survive a drag.
 */
export function applyStageChange(
  opportunity: Opportunity,
  stage: Stage,
  now: Date,
): Opportunity {
  if (opportunity.stage === stage) return opportunity
  const iso = toIso(now)

  const probability = opportunity.probabilityIsManual
    ? opportunity.probability
    : STAGE_DEFAULT_PROBABILITY[stage]

  const closed = stage === 'won' || stage === 'lost'

  return {
    ...opportunity,
    stage,
    probability: stage === 'won' ? 1 : stage === 'lost' ? 0 : probability,
    updatedAt: iso,
    lastActivityAt: iso,
    stageEnteredAt: iso,
    closedAt: closed ? iso : null,
    stageHistory: [...opportunity.stageHistory, { stage, at: iso }],
  }
}

/** Applies an edit from the deal form. */
export function applyEdit(
  opportunity: Opportunity,
  draft: OpportunityDraft,
  region: string,
  now: Date,
): Opportunity {
  const iso = toIso(now)
  const stageChanged = draft.stage !== opportunity.stage
  const closed = draft.stage === 'won' || draft.stage === 'lost'

  return {
    ...opportunity,
    name: draft.name.trim(),
    customerId: draft.customerId,
    ownerId: draft.ownerId,
    stage: draft.stage,
    value: draft.value,
    probability:
      draft.stage === 'won' ? 1 : draft.stage === 'lost' ? 0 : draft.probability,
    probabilityIsManual: draft.probabilityIsManual,
    expectedCloseDate: new Date(`${draft.expectedCloseDate}T12:00:00`).toISOString(),
    product: draft.product,
    source: draft.source,
    notes: draft.notes,
    region,
    updatedAt: iso,
    lastActivityAt: iso,
    closedAt: closed ? (opportunity.closedAt ?? iso) : null,
    stageEnteredAt: stageChanged ? iso : opportunity.stageEnteredAt,
    stageHistory: stageChanged
      ? [...opportunity.stageHistory, { stage: draft.stage, at: iso }]
      : opportunity.stageHistory,
  }
}

/** A move is real commercial activity, so it belongs on the timeline. */
export function stageChangeActivity(
  opportunity: Opportunity,
  from: Stage,
  to: Stage,
  now: Date,
): Activity {
  return {
    id: createId('act'),
    opportunityId: opportunity.id,
    ownerId: opportunity.ownerId,
    type: 'note',
    at: toIso(now),
    summary: `Stage moved from ${from} to ${to}`,
  }
}
