import { INTELLIGENCE_THRESHOLDS as T } from './thresholds'
import type {
  Insight,
  InsightCategory,
  InsightDraft,
  InsightSeverity,
} from './types'

/**
 * Priority engine.
 *
 * Turns a rule's draft into a scored insight. Four components, weighted:
 *
 *   financial impact 40% · urgency 30% · confidence 15% · business relevance 15%
 *
 * Nothing here is random and nothing is hand-assigned: two insights with the
 * same money at stake, the same deadline and the same confidence always score
 * the same, whichever rule produced them.
 */

/** How much a category matters to a commercial director, 0..1. */
const CATEGORY_RELEVANCE: Record<InsightCategory, number> = {
  revenue: 1,
  forecast: 0.95,
  pipeline: 0.9,
  opportunity: 0.85,
  team: 0.75,
  performance: 0.7,
  customer: 0.65,
  anomaly: 0.6,
  activity: 0.5,
}

const clamp = (value: number) => Math.max(0, Math.min(100, value))

/**
 * Impact is measured against the period commitment, not in absolute money: a
 * 40k risk means something very different to a team carrying 100k a month than
 * to one carrying 2M.
 */
function impactScore(impact: number | null, periodTarget: number): number {
  if (impact === null || impact <= 0) return 25
  if (periodTarget <= 0) return 50
  const share = impact / periodTarget
  // Saturates at a quarter of the commitment.
  return clamp((Math.min(share, 0.25) / 0.25) * 100)
}

function urgencyScore(daysUntil: number | null): number {
  if (daysUntil === null) return 45
  if (daysUntil < 0) return 100
  if (daysUntil <= 3) return 95
  if (daysUntil <= 7) return 85
  if (daysUntil <= 14) return 70
  if (daysUntil <= 30) return 50
  if (daysUntil <= 60) return 30
  return 15
}

export function scoreInsight(draft: InsightDraft, periodTarget: number): number {
  const score =
    impactScore(draft.impact, periodTarget) * 0.4 +
    urgencyScore(draft.daysUntil) * 0.3 +
    clamp(draft.confidence * 100) * 0.15 +
    CATEGORY_RELEVANCE[draft.category] * 100 * 0.15

  return Math.round(clamp(score))
}

export function severityFor(score: number, positive: boolean): InsightSeverity {
  if (positive) return 'positive'
  if (score >= T.priority.critical) return 'critical'
  if (score >= T.priority.high) return 'high'
  if (score >= T.priority.medium) return 'medium'
  return 'low'
}

/** Finalises a draft into the insight the UI consumes. */
export function finalise(draft: InsightDraft, periodTarget: number): Insight {
  const priorityScore = scoreInsight(draft, periodTarget)
  const { confidence, daysUntil, positive, ...rest } = draft
  void confidence
  void daysUntil

  return {
    ...rest,
    priorityScore,
    severity: severityFor(priorityScore, Boolean(positive)),
    status: 'new',
  }
}
