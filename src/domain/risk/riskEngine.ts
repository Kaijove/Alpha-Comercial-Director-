import { daysSince, daysUntil, type Opportunity } from '@/domain/commerce'

/**
 * Risk engine.
 *
 * A deterministic, explainable read on a single opportunity: same deal in, same
 * level and same reason out, every time. There is no model here and the UI only
 * consumes the result - it never re-derives risk of its own.
 *
 * Five inputs, in the order they matter:
 *   1. an expected close date already in the past
 *   2. inactivity, weighted by how close the deal is to its close date
 *   3. the stage it is sitting in
 *   4. probability
 *   5. value, which raises the stakes but never creates risk on its own
 */
export type RiskLevel = 'healthy' | 'attention' | 'at-risk'

export interface RiskAssessment {
  level: RiskLevel
  /** 0-100. Higher means more exposed. Used for ranking, not for display. */
  score: number
  /** The single most important reason, always derived from the rules above. */
  reason: string
  /** Every rule that fired, for the detail view. */
  factors: string[]
  inactiveDays: number
  daysToClose: number
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  healthy: 'Healthy',
  attention: 'Attention',
  'at-risk': 'At risk',
}

export const RISK_ORDER: Record<RiskLevel, number> = {
  'at-risk': 0,
  attention: 1,
  healthy: 2,
}

/** Inactivity beyond this many days makes a deal a talking point. */
export const STALE_DAYS = 12

/** Inside this many days, a deal is close enough that silence is costly. */
export const IMMINENT_DAYS = 10

const AT_RISK_SCORE = 60
const ATTENTION_SCORE = 30

export function assessOpportunityRisk(
  opportunity: Opportunity,
  now: Date = new Date(),
): RiskAssessment {
  const inactiveDays = daysSince(opportunity.lastActivityAt, now)
  const daysToClose = daysUntil(opportunity.expectedCloseDate, now)
  const factors: string[] = []
  let score = 0

  if (daysToClose < 0) {
    score += 55
    factors.push(
      `Expected close was ${Math.abs(daysToClose)} ${Math.abs(daysToClose) === 1 ? 'day' : 'days'} ago and the deal is still open`,
    )
  } else if (daysToClose <= IMMINENT_DAYS) {
    score += 15
    factors.push(`Expected to close in ${daysToClose} ${daysToClose === 1 ? 'day' : 'days'}`)
  }

  if (inactiveDays >= STALE_DAYS) {
    // Silence matters far more when the close date is near.
    score += daysToClose >= 0 && daysToClose <= IMMINENT_DAYS ? 45 : 30
    factors.push(`No activity for ${inactiveDays} days`)
  } else if (inactiveDays >= STALE_DAYS / 2) {
    score += 10
    factors.push(`Last activity ${inactiveDays} days ago`)
  }

  if (opportunity.stage === 'lead' && daysToClose <= IMMINENT_DAYS) {
    score += 20
    factors.push('Still in Lead with the close date approaching')
  }

  if (opportunity.probability < 0.4 && daysToClose <= IMMINENT_DAYS) {
    score += 15
    factors.push(
      `Only ${Math.round(opportunity.probability * 100)}% probability this close to the date`,
    )
  }

  const level: RiskLevel =
    score >= AT_RISK_SCORE ? 'at-risk' : score >= ATTENTION_SCORE ? 'attention' : 'healthy'

  const reason =
    factors[0] ??
    `Last activity ${inactiveDays === 0 ? 'today' : `${inactiveDays} days ago`}, closing in ${daysToClose} days`

  return {
    level,
    score: Math.min(100, score),
    reason: `${reason}.`,
    factors,
    inactiveDays,
    daysToClose,
  }
}

/** Closed deals carry no forward risk; this keeps callers from special-casing. */
export function isRiskRelevant(opportunity: Opportunity): boolean {
  return opportunity.stage !== 'won' && opportunity.stage !== 'lost'
}
