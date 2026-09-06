/**
 * Single swap point for persistence.
 *
 * The product runs entirely on localStorage. When a backend or CRM arrives, add an
 * implementation of `WorkspaceRepository` (e.g. `apiWorkspaceRepository`) and
 * change the two exports below — no feature code needs to be touched.
 */
export { localDraftRepository, localWorkspaceRepository } from './localRepository'
export { localCommercialRepository } from './commercialRepository'
export type { DraftRepository, WorkspaceRepository } from './types'

import { localDraftRepository, localWorkspaceRepository } from './localRepository'

import { localCommercialRepository } from './commercialRepository'

export const workspaceRepository = localWorkspaceRepository
export const draftRepository = localDraftRepository
export const commercialRepository = localCommercialRepository
