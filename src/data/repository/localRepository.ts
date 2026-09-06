import { readJson, removeRaw, writeJson } from '@/lib/storage'
import type { OnboardingDraft, Workspace } from '@/domain/workspace'
import { migrateWorkspace } from './migrations'
import type { DraftRepository, WorkspaceRepository } from './types'

export const WORKSPACE_KEY = 'workspace'
export const DRAFT_KEY = 'onboarding-draft'

export const localWorkspaceRepository: WorkspaceRepository = {
  load() {
    return migrateWorkspace(readJson<unknown>(WORKSPACE_KEY))
  },
  save(workspace: Workspace) {
    return writeJson(WORKSPACE_KEY, workspace)
  },
  clear() {
    removeRaw(WORKSPACE_KEY)
  },
}

export const localDraftRepository: DraftRepository = {
  load() {
    const draft = readJson<OnboardingDraft>(DRAFT_KEY)
    if (!draft || typeof draft !== 'object') return null
    return draft
  },
  save(draft: OnboardingDraft) {
    return writeJson(DRAFT_KEY, draft)
  },
  clear() {
    removeRaw(DRAFT_KEY)
  },
}
