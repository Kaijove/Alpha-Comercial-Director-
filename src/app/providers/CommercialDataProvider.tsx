import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { localCommercialRepository } from '@/data/repository/commercialRepository'
import { generateCommercialData } from '@/data/seed/generateCommercialData'
import {
  SOLO_OWNER_ID,
  type Activity,
  type CommercialDataset,
  type Opportunity,
  type Owner,
  type Stage,
} from '@/domain/commerce'
import {
  applyEdit,
  applyStageChange,
  buildOpportunity,
  stageChangeActivity,
  type OpportunityDraft,
} from '@/domain/pipeline/opportunityMutations'
import { directorFullName, type Workspace } from '@/domain/workspace'
import { useWorkspace } from './workspaceContext'
import {
  CommercialDataContext,
  type CommercialDataContextValue,
} from './commercialDataContext'

/**
 * The single source of truth for commercial data.
 *
 * The dataset is generated deterministically the first time a workspace opens
 * it, then persisted and owned by the user: creating, editing, moving or
 * deleting an opportunity writes straight through to storage. Dashboard,
 * Analytics and Pipeline all read this one object, so a change on any screen is
 * visible on every other one without any synchronisation code.
 */

/**
 * Identifies the workspace the dataset belongs to.
 *
 * Deliberately narrow: only the workspace's identity. The dataset is the user's
 * data once it exists, so raising a target or adding a rep must never throw
 * away edited deals - it only used to, back when the dataset was regenerated
 * from a signature that included those fields.
 */
function baseKeyOf(workspace: Workspace): string {
  return [workspace.company.name, workspace.createdAt].join('|')
}

/**
 * The roster comes from the workspace, never from the stored dataset.
 *
 * Otherwise a rep added in Settings would be missing from the owner selector
 * until the data was regenerated. Opportunities still reference owners by id,
 * so a removed rep leaves resolvable-but-empty references that the UI renders
 * as unassigned until they are reassigned.
 */
function ownersOf(workspace: Workspace): Owner[] {
  if (workspace.team.length === 0) {
    return [
      {
        id: SOLO_OWNER_ID,
        name: directorFullName(workspace.director) || 'You',
        role: workspace.director.jobTitle || 'Sales Director',
        accent: 0,
      },
    ]
  }
  return workspace.team.map((rep, index) => ({
    id: rep.id,
    name: rep.name,
    role: rep.role || 'Account Executive',
    accent: rep.accent ?? index,
  }))
}

export function CommercialDataProvider({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace()
  const baseKey = workspace ? baseKeyOf(workspace) : null

  // Keyed by baseKey so a workspace change swaps the dataset in one go.
  const loadedKey = useRef<string | null>(null)
  const [dataset, setDataset] = useState<CommercialDataset | null>(null)

  if (workspace && baseKey && loadedKey.current !== baseKey) {
    loadedKey.current = baseKey
    const stored = localCommercialRepository.load(baseKey)
    const next = stored ?? generateCommercialData(workspace)
    if (!stored) localCommercialRepository.save(baseKey, next)
    // Safe during render: this only runs when the key actually changes, and it
    // replaces state that would otherwise be stale for this very render.
    setDataset(next)
  }

  const commit = useCallback(
    (next: CommercialDataset) => {
      setDataset(next)
      if (baseKey) localCommercialRepository.save(baseKey, next)
    },
    [baseKey],
  )

  const replaceOpportunity = useCallback(
    (current: CommercialDataset, updated: Opportunity, activity?: Activity) => ({
      ...current,
      opportunities: current.opportunities.map((opportunity) =>
        opportunity.id === updated.id ? updated : opportunity,
      ),
      activities: activity ? [...current.activities, activity] : current.activities,
    }),
    [],
  )

  const createOpportunity = useCallback(
    (draft: OpportunityDraft) => {
      const current = dataset
      if (!current) throw new Error('Commercial data is not ready yet.')

      const region =
        current.customers.find((customer) => customer.id === draft.customerId)?.region ??
        'Central'
      const opportunity = buildOpportunity(draft, region, new Date())

      commit({ ...current, opportunities: [...current.opportunities, opportunity] })
      return opportunity
    },
    [dataset, commit],
  )

  const updateOpportunity = useCallback(
    (id: string, draft: OpportunityDraft) => {
      const current = dataset
      if (!current) return
      const existing = current.opportunities.find((opportunity) => opportunity.id === id)
      if (!existing) return

      const now = new Date()
      const region =
        current.customers.find((customer) => customer.id === draft.customerId)?.region ??
        existing.region
      const updated = applyEdit(existing, draft, region, now)
      const activity =
        draft.stage !== existing.stage
          ? stageChangeActivity(existing, existing.stage, draft.stage, now)
          : undefined

      commit(replaceOpportunity(current, updated, activity))
    },
    [dataset, commit, replaceOpportunity],
  )

  const moveOpportunity = useCallback(
    (id: string, stage: Stage) => {
      const current = dataset
      if (!current) return
      const existing = current.opportunities.find((opportunity) => opportunity.id === id)
      if (!existing || existing.stage === stage) return

      const now = new Date()
      const updated = applyStageChange(existing, stage, now)
      const activity = stageChangeActivity(existing, existing.stage, stage, now)

      commit(replaceOpportunity(current, updated, activity))
    },
    [dataset, commit, replaceOpportunity],
  )

  const deleteOpportunity = useCallback(
    (id: string) => {
      const current = dataset
      if (!current) return
      commit({
        ...current,
        opportunities: current.opportunities.filter(
          (opportunity) => opportunity.id !== id,
        ),
        activities: current.activities.filter(
          (activity) => activity.opportunityId !== id,
        ),
      })
    },
    [dataset, commit],
  )

  const reassignOpportunities = useCallback(
    (fromOwnerId: string, toOwnerId: string) => {
      const current = dataset
      if (!current || fromOwnerId === toOwnerId) return 0

      const moved = current.opportunities.filter(
        (opportunity) => opportunity.ownerId === fromOwnerId,
      ).length
      if (moved === 0) return 0

      const stamp = new Date().toISOString()
      commit({
        ...current,
        opportunities: current.opportunities.map((opportunity) =>
          opportunity.ownerId === fromOwnerId
            ? { ...opportunity, ownerId: toOwnerId, updatedAt: stamp }
            : opportunity,
        ),
        // Activities follow their opportunity, so history stays attached.
        activities: current.activities.map((activity) =>
          activity.ownerId === fromOwnerId
            ? { ...activity, ownerId: toOwnerId }
            : activity,
        ),
      })
      return moved
    },
    [dataset, commit],
  )

  const value = useMemo<CommercialDataContextValue | null>(() => {
    if (!dataset || !workspace) return null

    // The stored dataset carries the roster it was generated with; the live
    // workspace is the authority, so it wins.
    const roster = ownersOf(workspace)
    const effective: CommercialDataset = { ...dataset, owners: roster }

    const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]))
    const owners = new Map(roster.map((owner) => [owner.id, owner]))
    const opportunities = new Map(
      dataset.opportunities.map((opportunity) => [opportunity.id, opportunity]),
    )

    const activitiesByOpportunity = new Map<string, Activity[]>()
    for (const activity of dataset.activities) {
      const bucket = activitiesByOpportunity.get(activity.opportunityId)
      if (bucket) bucket.push(activity)
      else activitiesByOpportunity.set(activity.opportunityId, [activity])
    }

    return {
      dataset: effective,
      customerById: (id) => customers.get(id),
      ownerById: (id) => owners.get(id),
      opportunityById: (id) => opportunities.get(id),
      activitiesFor: (id) => activitiesByOpportunity.get(id) ?? [],
      createOpportunity,
      updateOpportunity,
      moveOpportunity,
      deleteOpportunity,
      reassignOpportunities,
      countOpportunitiesFor: (ownerId) =>
        dataset.opportunities.filter(
          (opportunity) => opportunity.ownerId === ownerId,
        ).length,
    }
  }, [
    dataset,
    workspace,
    createOpportunity,
    updateOpportunity,
    moveOpportunity,
    deleteOpportunity,
    reassignOpportunities,
  ])

  if (!value) return <>{children}</>

  return (
    <CommercialDataContext.Provider value={value}>{children}</CommercialDataContext.Provider>
  )
}
