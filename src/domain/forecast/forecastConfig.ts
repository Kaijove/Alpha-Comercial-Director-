/**
 * Every number the forecast model uses, in one place.
 *
 * The forecast is the figure a director repeats in a board meeting, so none of
 * it may be a magic constant buried in a formula. Anyone can read this file and
 * see exactly what the model assumes; changing commercial policy means editing
 * data here, not rewriting arithmetic.
 */
export const FORECAST_CONFIG = {
  /**
   * How much of a deal's weighted value survives, by health band.
   *
   * A deal nobody has touched for three weeks is not worth the same as an
   * identical deal being actively worked, even at the same probability - which
   * is precisely what plain `value x probability` misses.
   */
  healthFactor: {
    healthy: 1,
    attention: 0.9,
    'at-risk': 0.65,
    critical: 0.35,
  },

  /**
   * How much survives based on when the deal is due relative to the period end.
   *
   * A deal due in the last few days of the period has no room left to slip; a
   * deal already past its date and still open has slipped once already.
   */
  timing: {
    /** Deal already overdue and still open. */
    overdue: 0.5,
    /** Due inside the final stretch of the period. */
    tight: 0.9,
    /** Days before period end that counts as "the final stretch". */
    tightDays: 7,
    /** Comfortably inside the period. */
    comfortable: 1,
  },

  /**
   * Best case: how far a deal's probability is lifted toward certainty.
   *
   * Optimistic but plausible - a healthy deal at 60% closing at 80% is a good
   * quarter, not a fantasy. Nothing is ever lifted to 100%.
   */
  bestCaseUplift: {
    healthy: 0.5,
    attention: 0.3,
    'at-risk': 0.1,
    critical: 0,
  },
  /** No deal may be modelled above this probability, even in the best case. */
  bestCaseCeiling: 0.95,

  /**
   * Worst case: only deals this likely, and in a healthy band, are assumed to
   * land. Everything else is treated as not arriving inside the period.
   */
  worstCaseProbability: 0.7,
  worstCaseBands: ['healthy', 'attention'] as const,

  /** Probability at or above which a deal counts as "high confidence". */
  highConfidenceProbability: 0.7,
  /** Probability below which a deal counts as "low confidence". */
  lowConfidenceProbability: 0.3,

  /** Share of the open forecast in the top few deals that counts as concentrated. */
  concentrationThreshold: 0.35,
  /** How many deals that concentration is measured across. */
  concentrationDeals: 3,

  /** Share of forecast landing in the final stretch that counts as back-loaded. */
  lateConcentrationThreshold: 0.5,
  /** Days at the end of the period treated as the final stretch. */
  lateConcentrationDays: 10,

  /** Gap bands, as a share of target, used for the forecast state. */
  gap: {
    /** Within this of target, the forecast counts as "near target". */
    near: 0.03,
    /** Below target by more than this, the forecast is "critical". */
    critical: 0.12,
  },

  /** Confidence bands, 0-100. */
  confidence: {
    high: 70,
    moderate: 45,
  },

  /** Weights for the confidence score, renormalised over whatever is available. */
  confidenceWeights: {
    banked: 0.3,
    quality: 0.15,
    highConfidenceShare: 0.2,
    health: 0.15,
    concentration: 0.1,
    coverage: 0.1,
  },

  /** Weights for the probability of reaching target. */
  probabilityWeights: {
    forecastGap: 0.45,
    coverage: 0.2,
    pace: 0.15,
    conversion: 0.1,
    health: 0.1,
  },

  /** Penalties applied to the data quality score, per affected opportunity. */
  quality: {
    missingCloseDate: 6,
    missingProbability: 4,
    missingOwner: 3,
    noActivity: 2,
    /** Ceiling on what any single check can remove, so one issue cannot zero it. */
    maxPenaltyPerCheck: 25,
  },

  /** Sensitivity analysis steps, in win-rate percentage points. */
  sensitivitySteps: [-0.1, 0, 0.1],
} as const

export type ForecastConfig = typeof FORECAST_CONFIG
