/**
 * The structured insight every intelligence rule produces.
 *
 * The UI only ever consumes this shape. That is what keeps the rules testable
 * on their own, and what would let an optional interpretation layer sit between
 * the engine and the screen later without any component changing:
 *
 *   commercial data -> deterministic engine -> Insight[] -> UI
 */
export type InsightType = 'risk' | 'opportunity' | 'anomaly' | 'performance'

export type InsightCategory =
  | 'revenue'
  | 'pipeline'
  | 'opportunity'
  | 'forecast'
  | 'team'
  | 'activity'
  | 'customer'
  | 'performance'
  | 'anomaly'

export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'positive'

export type InsightStatus = 'new' | 'seen' | 'resolved' | 'dismissed'

export type EntityType = 'opportunity' | 'customer' | 'rep' | 'pipeline' | 'company'

export interface InsightEvidence {
  label: string
  value: string
}

export interface InsightAction {
  label: string
  to: string
}

export interface Insight {
  /**
   * Stable across regenerations: derived from the rule and the entity, never
   * from a counter or a timestamp. Insight status is persisted against it, so
   * an id that changed between sessions would lose the director's decisions.
   */
  id: string
  type: InsightType
  category: InsightCategory
  severity: InsightSeverity
  /** 0-100, from the priority engine. */
  priorityScore: number

  title: string
  description: string

  entityType: EntityType
  entityId: string | null
  entityName: string | null

  /** Money at stake, when the rule can quantify it. Null when it cannot. */
  impact: number | null

  /** Why it matters, in prose. */
  reason: string
  /** The exact conditions that fired, for "Why am I seeing this?". */
  triggers: string[]
  /** Supporting figures shown in the detail panel. */
  evidence: InsightEvidence[]
  recommendation: string
  action: InsightAction | null

  /**
   * The data event that made this true - a deal's last activity, the start of
   * the period - rather than the moment the page rendered. Generation time
   * would be identical for every insight and would tell the reader nothing.
   */
  createdAt: string

  /** Resolved from persisted state at read time; rules always emit 'new'. */
  status: InsightStatus
}

export const SEVERITY_LABELS: Record<InsightSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  positive: 'Positive',
}

export const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  positive: 4,
}

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  revenue: 'Revenue',
  pipeline: 'Pipeline',
  opportunity: 'Opportunity',
  forecast: 'Forecast',
  team: 'Team',
  activity: 'Activity',
  customer: 'Customer',
  performance: 'Performance',
  anomaly: 'Anomaly',
}

export const STATUS_LABELS: Record<InsightStatus, string> = {
  new: 'New',
  seen: 'Seen',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
}

/** A rule emits this; the priority engine turns it into a full Insight. */
export type InsightDraft = Omit<Insight, 'priorityScore' | 'severity' | 'status'> & {
  /**
   * How strongly the rule believes the signal, 0..1. Feeds the priority score;
   * a rule working from three closed deals should not claim full confidence.
   */
  confidence: number
  /** Days until the thing happens. Null when the signal is not time-bound. */
  daysUntil: number | null
  /** Positive signals keep their severity regardless of score. */
  positive?: boolean
}
