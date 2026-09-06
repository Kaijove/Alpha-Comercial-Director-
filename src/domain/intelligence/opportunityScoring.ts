import {
  OPEN_STAGES,
  daysSince,
  daysUntil,
  type Activity,
  type Opportunity,
} from '@/domain/commerce'
import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'

/**
 * Two different questions about the same deal.
 *
 * **Health** asks "how healthy is the commercial situation around this deal" -
 * is anyone working it, is it moving, is it about to run out of time.
 *
 * **Score** asks "how much does this deal deserve the director's attention" -
 * a blend of what is at stake, how likely it is, how soon it lands and how
 * healthy it looks.
 *
 * Neither is probability, and neither ever writes back to it: probability is
 * the rep's judgement and stays theirs.
 */
export type HealthBand = 'healthy' | 'attention' | 'at-risk' | 'critical'

export const HEALTH_BAND_LABELS: Record<HealthBand, string> = {
  healthy: 'Healthy',
  attention: 'Attention',
  'at-risk': 'At risk',
  critical: 'Critical',
}

export interface OpportunityHealth {
  /** 0-100. Higher is healthier. */
  score: number
  band: HealthBand
  /** The single biggest thing dragging the score down. */
  reason: string
  /** Every factor that moved the score, for the detail panel. */
  factors: string[]
  inactiveDays: number
  daysToClose: number
  /** Stages entered in the last 60 days: is the deal actually moving. */
  recentProgressions: number
  activityCount: number
}

export interface ScoringContext {
  now: Date
  /** Activities belonging to this opportunity. */
  activities: Activity[]
  /** Average value of the open pipeline, used to judge "high value". */
  averageOpenValue: number
}

/** Clamps to the 0-100 band the whole module works in. */
const clamp = (value: number) => Math.max(0, Math.min(100, value))

export function assessOpportunityHealth(
  opportunity: Opportunity,
  context: ScoringContext,
): OpportunityHealth {
  const inactiveDays = daysSince(opportunity.lastActivityAt, context.now)
  const daysToClose = daysUntil(opportunity.expectedCloseDate, context.now)
  const factors: string[] = []

  // Start healthy and subtract for everything that is wrong. Penalties are
  // ordered so the first one recorded is the most serious.
  let score = 100

  if (daysToClose < 0) {
    score -= 40
    factors.push(
      `Expected close was ${Math.abs(daysToClose)} ${Math.abs(daysToClose) === 1 ? 'day' : 'days'} ago and the deal is still open`,
    )
  }

  if (inactiveDays >= T.stalledDays) {
    // Silence close to the deadline is far worse than silence months out, but
    // both are serious: a deal nobody has contacted is not being worked.
    const penalty = daysToClose >= 0 && daysToClose <= T.imminentDays ? 50 : 35
    score -= penalty
    factors.push(`No activity for ${inactiveDays} days`)
  } else if (inactiveDays >= T.stalledDays / 2) {
    score -= 8
    factors.push(`Last activity ${inactiveDays} days ago`)
  }

  // A deal still near the top of the funnel with days to go is not progressing.
  const stageIndex = OPEN_STAGES.indexOf(opportunity.stage)
  if (stageIndex >= 0 && daysToClose >= 0 && daysToClose <= T.imminentDays) {
    if (stageIndex <= 1) {
      score -= 25
      factors.push(
        `Still in ${opportunity.stage} with ${daysToClose} days to the expected close`,
      )
    } else if (stageIndex === 2) {
      score -= 10
      factors.push(`Still in proposal with ${daysToClose} days to the expected close`)
    }
  }

  // Movement: stages entered recently show the deal is actually advancing.
  const sixtyDaysAgo = new Date(context.now.getTime() - 60 * 86_400_000)
  const recentProgressions = opportunity.stageHistory.filter(
    (event) => new Date(event.at) >= sixtyDaysAgo,
  ).length

  if (recentProgressions === 0 && stageIndex > 0) {
    score -= 15
    factors.push('No stage movement in the last 60 days')
  } else if (recentProgressions >= 2) {
    score += 8
    factors.push(`${recentProgressions} stage moves in the last 60 days`)
  }

  const activityCount = context.activities.length
  if (activityCount === 0) {
    score -= 12
    factors.push('No activity has ever been logged against this deal')
  } else if (activityCount >= 6 && inactiveDays < T.stalledDays) {
    // The bonus is for a deal being worked *now*. A history of contact that
    // stopped two weeks ago is not a reason to cancel out the silence.
    score += 5
    factors.push(`${activityCount} logged activities`)
  }

  if (opportunity.probability < 0.3 && daysToClose >= 0 && daysToClose <= T.imminentDays) {
    score -= 10
    factors.push(
      `Only ${Math.round(opportunity.probability * 100)}% probability this close to the date`,
    )
  }

  const final = clamp(score)
  const band: HealthBand =
    final >= T.health.healthy
      ? 'healthy'
      : final >= T.health.attention
        ? 'attention'
        : final >= T.health.atRisk
          ? 'at-risk'
          : 'critical'

  return {
    score: Math.round(final),
    band,
    reason:
      factors[0] ??
      `Active ${inactiveDays === 0 ? 'today' : `${inactiveDays} days ago`}, closing in ${daysToClose} days`,
    factors,
    inactiveDays,
    daysToClose,
    recentProgressions,
    activityCount,
  }
}

/**
 * Commercial priority for a single deal, 0-100.
 *
 * Explicitly not `value x probability` - that is weighted value, which the app
 * already has and which says nothing about urgency or about whether anyone is
 * working the deal. Four components, weighted:
 *
 *   size 30% · probability 25% · urgency 25% · health 20%
 */
export function scoreOpportunity(
  opportunity: Opportunity,
  health: OpportunityHealth,
  context: ScoringContext,
): number {
  // Size relative to the average open deal, saturating at 3x.
  const relative =
    context.averageOpenValue > 0 ? opportunity.value / context.averageOpenValue : 1
  const sizeScore = clamp((Math.min(relative, 3) / 3) * 100)

  const probabilityScore = clamp(opportunity.probability * 100)

  // Urgency peaks just before the close date and decays over three months.
  const days = health.daysToClose
  const urgencyScore =
    days < 0
      ? 100
      : days <= 7
        ? 95
        : days <= 30
          ? 70
          : days <= 60
            ? 45
            : days <= 90
              ? 25
              : 10

  const score =
    sizeScore * 0.3 + probabilityScore * 0.25 + urgencyScore * 0.25 + health.score * 0.2

  return Math.round(clamp(score))
}

export interface ScoredOpportunity {
  opportunity: Opportunity
  health: OpportunityHealth
  score: number
}

/** Scores an entire open pipeline in one pass. */
export function scorePipeline(
  opportunities: Opportunity[],
  activitiesFor: (opportunityId: string) => Activity[],
  now: Date,
): ScoredOpportunity[] {
  const open = opportunities.filter(
    (opportunity) => opportunity.stage !== 'won' && opportunity.stage !== 'lost',
  )
  const averageOpenValue =
    open.length > 0
      ? open.reduce((total, opportunity) => total + opportunity.value, 0) / open.length
      : 0

  return open.map((opportunity) => {
    const context: ScoringContext = {
      now,
      activities: activitiesFor(opportunity.id),
      averageOpenValue,
    }
    const health = assessOpportunityHealth(opportunity, context)
    return { opportunity, health, score: scoreOpportunity(opportunity, health, context) }
  })
}
