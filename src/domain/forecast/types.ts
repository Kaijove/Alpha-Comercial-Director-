import type { Opportunity } from '@/domain/commerce'
import type { HealthBand, OpportunityHealth } from '@/domain/intelligence/opportunityScoring'

/**
 * The shape the forecast engine hands to the rest of the product.
 *
 * Everything here is derived. Nothing is stored, nothing is random, and the
 * same commercial data always produces the same report - so the Dashboard, the
 * Forecast page and the Intelligence engine can all read this one structure and
 * be guaranteed to agree.
 */

/** One open deal's contribution to the period forecast. */
export interface ForecastContribution {
  opportunity: Opportunity
  health: OpportunityHealth
  /** Deal value as recorded. */
  value: number
  /** Rep's own probability, 0..1. */
  probability: number
  /** 0..1 multiplier from the health band. */
  healthFactor: number
  /** 0..1 multiplier from how the close date sits against the period end. */
  timingFactor: number
  /** value x probability x healthFactor x timingFactor. */
  contribution: number
  /** Plain-language reason the deal is discounted, if it is. */
  adjustment: string | null
  /** Which scenarios this deal lands in. */
  inWorstCase: boolean
  inBestCase: boolean
  /** Contribution under the best case. */
  bestCaseContribution: number
}

export type ScenarioKey = 'worst' | 'base' | 'best'

export interface ForecastScenario {
  key: ScenarioKey
  label: string
  /** Projected period revenue. */
  value: number
  /** Closed revenue plus this scenario's pipeline contribution. */
  fromPipeline: number
  /** value / target, null without a target. */
  attainment: number | null
  /** value - target. Negative is a shortfall. */
  gap: number
  /** How many open deals the scenario assumes land. */
  dealCount: number
  /** The assumption, stated so the number is never a black box. */
  assumption: string
}

export type ForecastState = 'above-target' | 'on-track' | 'at-risk' | 'critical'

export interface ForecastGap {
  state: ForecastState
  label: string
  /** forecast - target. Negative is a shortfall. */
  amount: number
  /** Shortfall as a share of target, null without a target. */
  ratio: number | null
  /** Extra revenue needed to reach target. Zero when already above. */
  additionalRequired: number
  summary: string
}

export interface ForecastDriver {
  tone: 'positive' | 'negative'
  text: string
  /** Money the driver refers to, for ordering. Null when it is not a figure. */
  amount: number | null
}

export interface ForecastConfidence {
  /** 0-100. */
  score: number
  level: 'high' | 'moderate' | 'low'
  label: string
  summary: string
  factors: ConfidenceFactor[]
}

export interface ConfidenceFactor {
  key: 'banked' | 'quality' | 'highConfidenceShare' | 'health' | 'concentration' | 'coverage'
  label: string
  /** 0-100 before weighting. */
  score: number
  /** Renormalised share of the final score. */
  weight: number
  detail: string
  value: number | null
}

export interface TargetProbability {
  /** 0-100. */
  score: number
  summary: string
  factors: ConfidenceFactor[]
}

/** One step of the target-to-forecast waterfall. */
export interface WaterfallStep {
  key: string
  label: string
  /** Signed contribution to the running total. */
  delta: number
  /** Running total after this step. */
  total: number
  tone: 'base' | 'positive' | 'negative' | 'result'
  detail: string
}

export interface TimelineBucket {
  key: string
  label: string
  /** Forecast contribution expected in this window. */
  value: number
  dealCount: number
  /** Share of the open forecast, 0..1. */
  share: number
}

export interface ForecastTimeline {
  buckets: TimelineBucket[]
  /** Share of the open forecast landing in the final stretch of the period. */
  lateShare: number
  lateDays: number
  /** True when the period leans on its last days. */
  backLoaded: boolean
  summary: string
}

export interface PathToTarget {
  /** Extra revenue needed. Zero when the forecast already covers target. */
  required: number
  /** The fewest open deals whose full value would cover the gap. */
  deals: ForecastContribution[]
  /** How many of `candidates` are needed. */
  needed: number
  /** The pool the deals were chosen from. */
  candidates: number
  /** Face value of open deals above the high-confidence probability. */
  highConfidenceValue: number
  summary: string
  reachable: boolean
}

export interface RepForecast {
  ownerId: string
  name: string
  revenue: number
  target: number
  pipeline: number
  weightedPipeline: number
  /** Their share of the base forecast. */
  forecast: number
  fromPipeline: number
  attainment: number | null
  gap: number
  /** 0-100, computed on the same model as the company figure. */
  confidence: number
  state: ForecastState
  dealCount: number
}

export interface DataQualityIssue {
  key: string
  label: string
  count: number
  /** Points removed from the score. */
  penalty: number
}

export interface ForecastDataQuality {
  /** 0-100. */
  score: number
  issues: DataQualityIssue[]
  /** Open deals examined. */
  examined: number
  summary: string
}

export interface ForecastRiskEntry {
  contribution: ForecastContribution
  /** What this deal still adds to the forecast despite the risk. */
  atRisk: number
  reason: string
  recommendation: string
}

export interface ForecastRisk {
  /** Forecast value carried by deals in a poor health band. */
  total: number
  entries: ForecastRiskEntry[]
  /** Share of the open forecast that is exposed. */
  share: number
  methodology: string
}

export interface SensitivityPoint {
  key: string
  label: string
  value: number
  attainment: number | null
  delta: number
}

export interface ForecastSensitivity {
  conversion: SensitivityPoint[]
  pipeline: SensitivityPoint[]
}

/** Inputs a director can move in the simulator. Never persisted as real data. */
export interface SimulatorInputs {
  /** Multiplier on every probability, 1 = unchanged. */
  winRateFactor: number
  /** Multiplier on deal value, 1 = unchanged. */
  dealSizeFactor: number
  /** Extra deals assumed to close at the average contribution. */
  extraDeals: number
}

export const DEFAULT_SIMULATOR: SimulatorInputs = {
  winRateFactor: 1,
  dealSizeFactor: 1,
  extraDeals: 0,
}

export interface SimulatorResult {
  value: number
  attainment: number | null
  gap: number
  probability: number
  /** True when nothing has been moved from the defaults. */
  isDefault: boolean
}

/**
 * A point-in-time record of what the forecast said.
 *
 * Stored so that "what did we predict two weeks ago" becomes answerable later.
 * Nothing in the product fabricates one: a snapshot exists only because someone
 * took it, and accuracy stays unavailable until real ones accumulate.
 */
export interface ForecastSnapshot {
  id: string
  /** Period key plus the period start, e.g. "mtd:2026-06-01". */
  period: string
  periodLabel: string
  createdAt: string
  target: number
  forecastValue: number
  scenario: ScenarioKey
  confidence: number
  probability: number
  /** Filled in once the period has closed; null until then. */
  actualValue: number | null
}

export interface ForecastAccuracy {
  available: boolean
  /** Snapshots whose period has completed and can be scored. */
  scored: {
    snapshot: ForecastSnapshot
    variance: number
    accuracy: number
  }[]
  /** Mean signed variance: positive means the forecast ran high. */
  bias: number | null
  message: string
}

export interface ForecastReport {
  /** ---- Fields the rest of the product already consumed --------------- */
  /** Base case projected revenue for the period. */
  value: number
  closedRevenue: number
  expectedFromPipeline: number
  /** value / target, null when no target is set. */
  attainment: number | null
  /** value - target. Negative means a shortfall. */
  gap: number
  /** Deals contributing to `expectedFromPipeline`, richest first. */
  contributors: Opportunity[]

  /** ---- The advanced model -------------------------------------------- */
  target: number
  scenarios: Record<ScenarioKey, ForecastScenario>
  scenarioList: ForecastScenario[]
  contributions: ForecastContribution[]
  gapDetail: ForecastGap
  confidence: ForecastConfidence
  probability: TargetProbability
  waterfall: WaterfallStep[]
  timeline: ForecastTimeline
  path: PathToTarget
  reps: RepForecast[]
  quality: ForecastDataQuality
  risk: ForecastRisk
  sensitivity: ForecastSensitivity
  drivers: ForecastDriver[]
  /** Share of the open forecast carried by deals in each health band. */
  bandShares: Record<HealthBand, number>
  /** Stated in the UI so the model is never a black box. */
  methodology: string
}
