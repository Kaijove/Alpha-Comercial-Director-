import { FORECAST_CONFIG as C } from './forecastConfig'
import { totalContribution } from './forecastCalculator'
import type { ForecastContribution, ForecastScenario, ScenarioKey } from './types'

/**
 * Worst, base and best case.
 *
 * None of the three is a percentage applied to the others - that would be a
 * decoration, not a scenario. Each is a different, stated assumption about
 * which deals land, evaluated over the same deal-level model:
 *
 *   Worst  only deals that are both likely (>= 70%) and in a healthy band
 *          arrive; everything else slips out of the period.
 *   Base   every deal contributes value x probability x health x timing.
 *   Best   every deal converts at its probability lifted toward certainty by
 *          its health band, capped at 95%, with no timing discount - and never
 *          below what the base case already credits it with.
 *
 * Closed revenue is common to all three: money already won cannot un-win.
 */
function build(
  key: ScenarioKey,
  label: string,
  assumption: string,
  closedRevenue: number,
  fromPipeline: number,
  dealCount: number,
  target: number,
): ForecastScenario {
  const value = closedRevenue + fromPipeline
  return {
    key,
    label,
    value,
    fromPipeline,
    attainment: target > 0 ? value / target : null,
    gap: value - target,
    dealCount,
    assumption,
  }
}

export function buildScenarios(
  contributions: ForecastContribution[],
  closedRevenue: number,
  target: number,
): Record<ScenarioKey, ForecastScenario> {
  const worstDeals = contributions.filter((entry) => entry.inWorstCase)
  const bestDeals = contributions.filter((entry) => entry.inBestCase)

  const worst = build(
    'worst',
    'Worst Case',
    `Only the ${worstDeals.length} open ${worstDeals.length === 1 ? 'deal' : 'deals'} at ${Math.round(C.worstCaseProbability * 100)}% or above and in a healthy band are assumed to land. Everything else slips past the period.`,
    closedRevenue,
    totalContribution(worstDeals),
    worstDeals.length,
    target,
  )

  const base = build(
    'base',
    'Base Case',
    'Every open deal due in the period contributes its value multiplied by probability, health and timing.',
    closedRevenue,
    totalContribution(contributions),
    contributions.length,
    target,
  )

  const best = build(
    'best',
    'Best Case',
    `Every open deal converts at its probability lifted toward certainty by its health, capped at ${Math.round(C.bestCaseCeiling * 100)}%, with no timing discount.`,
    closedRevenue,
    bestDeals.reduce((total, entry) => total + entry.bestCaseContribution, 0),
    bestDeals.length,
    target,
  )

  return { worst, base, best }
}
