import { FORECAST_CONFIG as C } from './forecastConfig'
import type {
  ForecastContribution,
  ForecastSensitivity,
  SensitivityPoint,
  SimulatorInputs,
  SimulatorResult,
} from './types'

/**
 * "What happens if things go a little better, or a little worse."
 *
 * Every figure here is a re-run of the same deal-level model over the same
 * unchanged opportunities. Nothing is mutated: the sensitivity table and the
 * simulator are pure functions of the real pipeline, so a director can move a
 * slider all afternoon and the commercial data is exactly where they left it.
 */
export function buildSensitivity(
  contributions: ForecastContribution[],
  closedRevenue: number,
  target: number,
): ForecastSensitivity {
  const at = (factor: number) =>
    closedRevenue +
    contributions.reduce(
      (total, entry) =>
        total +
        entry.value *
          Math.min(1, entry.probability * factor) *
          entry.healthFactor *
          entry.timingFactor,
      0,
    )

  const base = at(1)

  const conversion: SensitivityPoint[] = C.sensitivitySteps.map((step) => {
    const value = at(1 + step)
    return {
      key: `conversion:${step}`,
      label: step === 0 ? 'Current conversion' : `${step > 0 ? '+' : ''}${Math.round(step * 100)}% conversion`,
      value,
      attainment: target > 0 ? value / target : null,
      delta: value - base,
    }
  })

  // Pipeline exclusions: the same model over a narrower set of deals.
  const subtotal = (entries: ForecastContribution[]) =>
    closedRevenue + entries.reduce((total, entry) => total + entry.contribution, 0)

  const pipeline: SensitivityPoint[] = [
    {
      key: 'pipeline:all',
      label: 'All open deals',
      value: base,
      attainment: target > 0 ? base / target : null,
      delta: 0,
    },
    {
      key: 'pipeline:no-low',
      label: 'Excluding low-confidence deals',
      value: subtotal(
        contributions.filter((entry) => entry.probability >= C.lowConfidenceProbability),
      ),
      attainment: null,
      delta: 0,
    },
    {
      key: 'pipeline:no-risk',
      label: 'Excluding at-risk deals',
      value: subtotal(
        contributions.filter(
          (entry) => entry.health.band === 'healthy' || entry.health.band === 'attention',
        ),
      ),
      attainment: null,
      delta: 0,
    },
    {
      key: 'pipeline:high-only',
      label: 'High-confidence deals only',
      value: subtotal(
        contributions.filter(
          (entry) =>
            entry.probability >= C.highConfidenceProbability &&
            entry.health.band === 'healthy',
        ),
      ),
      attainment: null,
      delta: 0,
    },
  ].map((point) => ({
    ...point,
    attainment: target > 0 ? point.value / target : null,
    delta: point.value - base,
  }))

  return { conversion, pipeline }
}

/**
 * The simulator.
 *
 * Three levers, applied to the same model:
 *   - win rate scales every probability (capped at 1, never beyond certainty);
 *   - deal size scales every value;
 *   - extra deals add that many at the average contribution of the real ones,
 *     which is the only honest stand-in for a deal that does not exist yet.
 *
 * The result is derived on every call and never written anywhere.
 */
export function simulate(
  contributions: ForecastContribution[],
  closedRevenue: number,
  target: number,
  baseProbability: number,
  inputs: SimulatorInputs,
): SimulatorResult {
  const fromPipeline = contributions.reduce(
    (total, entry) =>
      total +
      entry.value *
        inputs.dealSizeFactor *
        Math.min(1, entry.probability * inputs.winRateFactor) *
        entry.healthFactor *
        entry.timingFactor,
    0,
  )

  const average = contributions.length > 0 ? fromPipeline / contributions.length : 0
  const value = closedRevenue + fromPipeline + average * inputs.extraDeals

  const isDefault =
    inputs.winRateFactor === 1 && inputs.dealSizeFactor === 1 && inputs.extraDeals === 0

  // The probability moves with the simulated gap, anchored on the real score so
  // an untouched simulator always reproduces the headline figure exactly.
  const baseValue = closedRevenue + contributions.reduce((t, e) => t + e.contribution, 0)
  const shift =
    target > 0 ? ((value - baseValue) / target) * 100 * PROBABILITY_SENSITIVITY : 0

  return {
    value,
    attainment: target > 0 ? value / target : null,
    gap: value - target,
    probability: Math.max(0, Math.min(100, Math.round(baseProbability + shift))),
    isDefault,
  }
}

/**
 * How much a point of target attainment moves the probability. Derived from the
 * slope of the forecast-gap curve in the projection engine around target, so the
 * simulator and the headline probability tell the same story.
 */
const PROBABILITY_SENSITIVITY = 1.8
