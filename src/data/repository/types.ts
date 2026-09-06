import type { OnboardingDraft, Workspace } from '@/domain/workspace'

/**
 * Persistence contract. The app never talks to localStorage directly — it goes
 * through these interfaces, so a future CRM/API implementation only has to
 * satisfy the same shape (see `src/data/repository/index.ts`).
 */
export interface WorkspaceRepository {
  load(): Workspace | null
  save(workspace: Workspace): boolean
  clear(): void
}

export interface DraftRepository {
  load(): OnboardingDraft | null
  save(draft: OnboardingDraft): boolean
  clear(): void
}
