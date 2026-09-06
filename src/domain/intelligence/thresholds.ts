/**
 * Every commercial threshold the intelligence rules use, in one place.
 *
 * Deliberately not scattered through the rule files and never inside a
 * component: these are business policy, and a director changing "what counts as
 * stalled" should not have to read rule code to find it.
 */
export const INTELLIGENCE_THRESHOLDS = {
  /** Days without activity before an open deal counts as stalled. */
  stalledDays: 12,
  /** Days to expected close inside which silence becomes expensive. */
  imminentDays: 10,
  /** Window used by the "closing soon" signal. */
  closingSoonDays: 14,

  /** Open pipeline over remaining target considered healthy. */
  healthyCoverage: 3,
  /** Below this, pipeline coverage is a critical gap rather than a warning. */
  criticalCoverage: 1.5,

  /** A deal is "high value" above this multiple of the average open deal. */
  highValueMultiple: 1.5,
  /** Probability below which a deal near its close date is fragile. */
  fragileProbability: 0.6,

  /** Share of revenue in the top accounts that counts as concentration. */
  customerConcentration: 0.45,
  /** Accounts examined for that concentration. */
  concentrationAccounts: 3,
  /** Share of revenue from one rep that counts as concentration. */
  repConcentration: 0.4,
  /** Share of one rep's pipeline in a single deal that counts as reliance. */
  dealConcentration: 0.4,

  /** Minimum closed deals before a win rate is treated as meaningful. */
  minClosedForRate: 5,

  // --- Anomaly sensitivity, measured against a trailing baseline ----------
  anomaly: {
    /** Relative move in revenue against the monthly baseline. */
    revenue: 0.25,
    /** Move in win rate, in absolute points. */
    winRate: 0.08,
    /** Relative move in open pipeline. */
    pipeline: 0.25,
    /** Relative move in average deal size. */
    dealSize: 0.2,
    /** Relative drop in logged activity. */
    activity: 0.4,
    /** Months of history required before anomalies are reported at all. */
    minBaselineMonths: 3,
  },

  /** Priority score bands. */
  priority: {
    critical: 75,
    high: 50,
    medium: 25,
  },

  /** Opportunity health bands, 0-100. */
  health: {
    healthy: 70,
    attention: 55,
    atRisk: 35,
  },
} as const

export type IntelligenceThresholds = typeof INTELLIGENCE_THRESHOLDS
