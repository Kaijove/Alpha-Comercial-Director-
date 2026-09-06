import type { SalesRep, Workspace } from '@/domain/workspace'

/**
 * Per-rep commitments.
 *
 * A rep either carries a quota that was set for them, or an equal share of the
 * team's monthly commitment. Explicit quotas are honoured literally: if a
 * director types 200k, the rep is measured against 200k, not against a
 * normalised slice of the team number. The team target is therefore the sum of
 * the individual ones, which is how quota is actually assigned - and any gap
 * against the company commitment is shown rather than hidden.
 */
export function repMonthlyTarget(rep: SalesRep, workspace: Workspace): number {
  if (rep.monthlyTarget !== null && rep.monthlyTarget > 0) return rep.monthlyTarget
  const size = Math.max(1, workspace.team.length)
  return workspace.goals.monthlyTarget / size
}

export function repAnnualTarget(rep: SalesRep, workspace: Workspace): number {
  if (rep.annualTarget !== null && rep.annualTarget > 0) return rep.annualTarget
  const size = Math.max(1, workspace.team.length)
  const annual =
    workspace.goals.annualTarget > 0
      ? workspace.goals.annualTarget
      : workspace.goals.monthlyTarget * 12
  return annual / size
}

/**
 * How many months' worth of commitment a period represents.
 *
 * Derived from the period target the rest of the app already computed, so a
 * calendar period, a trailing window and a custom range all scale the same way
 * without this module needing to know which it is looking at.
 */
export function periodMultiplier(periodTarget: number, workspace: Workspace): number {
  if (workspace.goals.monthlyTarget <= 0) return 1
  return periodTarget / workspace.goals.monthlyTarget
}

/** Target per rep for a period, keyed by owner id. */
export function buildRepTargets(
  workspace: Workspace,
  periodTarget: number,
): Map<string, number> {
  const multiplier = periodMultiplier(periodTarget, workspace)
  const targets = new Map<string, number>()

  if (workspace.team.length === 0) {
    // A solo director owns the whole commitment.
    targets.set('owner_director', periodTarget)
    return targets
  }

  for (const rep of workspace.team) {
    targets.set(rep.id, repMonthlyTarget(rep, workspace) * multiplier)
  }
  return targets
}

/** Sum of the individual commitments for a period. */
export function teamTargetFor(workspace: Workspace, periodTarget: number): number {
  let total = 0
  for (const value of buildRepTargets(workspace, periodTarget).values()) total += value
  return total
}

/** True when quota assigned to reps differs materially from the commitment. */
export function hasQuotaGap(workspace: Workspace, periodTarget: number): boolean {
  if (periodTarget <= 0) return false
  const assigned = teamTargetFor(workspace, periodTarget)
  return Math.abs(assigned - periodTarget) / periodTarget > 0.01
}
