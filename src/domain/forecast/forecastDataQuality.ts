import type { Activity, Opportunity } from '@/domain/commerce'
import { FORECAST_CONFIG as C } from './forecastConfig'
import { clamp100 } from '@/domain/metrics/curve'
import type { DataQualityIssue, ForecastDataQuality } from './types'

/**
 * How much the forecast can be trusted as an artefact of the data behind it.
 *
 * A forecast built on deals with no close date and no owner is arithmetic, not
 * a forecast. Rather than silently swallowing bad records, the engine scores
 * them and says what is missing - so a low number is a prompt to fix the CRM,
 * not a reason to distrust the model.
 */
export function assessDataQuality(
  openOpportunities: Opportunity[],
  activitiesFor: (opportunityId: string) => Activity[],
): ForecastDataQuality {
  const examined = openOpportunities.length

  if (examined === 0) {
    return {
      score: 100,
      issues: [],
      examined: 0,
      summary: 'No open opportunities to check.',
    }
  }

  const checks: { key: string; label: string; per: number; failing: number }[] = [
    {
      key: 'close-date',
      label: 'missing an expected close date',
      per: C.quality.missingCloseDate,
      failing: openOpportunities.filter(
        (o) => !o.expectedCloseDate || Number.isNaN(new Date(o.expectedCloseDate).getTime()),
      ).length,
    },
    {
      key: 'probability',
      label: 'without a probability',
      per: C.quality.missingProbability,
      failing: openOpportunities.filter(
        (o) => !Number.isFinite(o.probability) || o.probability <= 0,
      ).length,
    },
    {
      key: 'owner',
      label: 'without an owner',
      per: C.quality.missingOwner,
      failing: openOpportunities.filter((o) => !o.ownerId).length,
    },
    {
      key: 'activity',
      label: 'with no activity ever logged',
      per: C.quality.noActivity,
      failing: openOpportunities.filter((o) => activitiesFor(o.id).length === 0).length,
    },
  ]

  const issues: DataQualityIssue[] = []
  let penalty = 0

  for (const check of checks) {
    if (check.failing === 0) continue
    // Scale by how much of the pipeline is affected, then cap: one bad record
    // in a thousand should barely register, and no single check can zero the
    // score on its own.
    const share = check.failing / examined
    const raw = share * check.per * 10
    const capped = Math.min(C.quality.maxPenaltyPerCheck, raw)
    penalty += capped
    issues.push({
      key: check.key,
      label: `${check.failing} ${check.failing === 1 ? 'opportunity is' : 'opportunities are'} ${check.label}`,
      count: check.failing,
      penalty: Math.round(capped),
    })
  }

  const score = Math.round(clamp100(100 - penalty))

  return {
    score,
    issues: issues.sort((a, b) => b.penalty - a.penalty),
    examined,
    summary:
      issues.length === 0
        ? `All ${examined} open opportunities carry the fields the forecast reads.`
        : `${issues.length} data ${issues.length === 1 ? 'issue' : 'issues'} across ${examined} open opportunities reduce how much the forecast can be relied on.`,
  }
}
