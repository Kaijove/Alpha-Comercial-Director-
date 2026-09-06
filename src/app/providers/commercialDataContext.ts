import { createContext, useContext } from 'react'
import type {
  Activity,
  CommercialDataset,
  Customer,
  Opportunity,
  Owner,
  Stage,
} from '@/domain/commerce'
import type { OpportunityDraft } from '@/domain/pipeline/opportunityMutations'

export interface CommercialDataContextValue {
  dataset: CommercialDataset
  /** Resolve relations by id; records are never duplicated across entities. */
  customerById: (id: string) => Customer | undefined
  ownerById: (id: string) => Owner | undefined
  activitiesFor: (opportunityId: string) => Activity[]
  opportunityById: (id: string) => Opportunity | undefined

  /**
   * Mutations. Every screen reads from this one dataset, so any of these is
   * immediately reflected on the Dashboard, in Analytics and in the Pipeline,
   * and is persisted before the call returns.
   */
  createOpportunity: (draft: OpportunityDraft) => Opportunity
  updateOpportunity: (id: string, draft: OpportunityDraft) => void
  moveOpportunity: (id: string, stage: Stage) => void
  deleteOpportunity: (id: string) => void
  /**
   * Moves every opportunity from one owner to another. Used when a rep leaves
   * the roster, so their deals are handed over rather than silently orphaned.
   * Returns how many were reassigned.
   */
  reassignOpportunities: (fromOwnerId: string, toOwnerId: string) => number
  /** How many opportunities an owner currently holds. */
  countOpportunitiesFor: (ownerId: string) => number
}

/** Kept apart from the provider component so hot reloads never break it. */
export const CommercialDataContext = createContext<CommercialDataContextValue | null>(null)

export function useCommercialData(): CommercialDataContextValue {
  const context = useContext(CommercialDataContext)
  if (!context) {
    throw new Error('useCommercialData must be used inside <CommercialDataProvider>.')
  }
  return context
}
