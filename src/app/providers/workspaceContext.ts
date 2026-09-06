import { createContext, useContext } from 'react'
import type {
  OnboardingDraft,
  Workspace,
  WorkspacePatch,
} from '@/domain/workspace'
import type { FormatContext } from '@/lib/format'

export type WorkspaceStatus = 'loading' | 'ready'

export interface WorkspaceContextValue {
  status: WorkspaceStatus
  workspace: Workspace | null
  isOnboarded: boolean
  /** False when the browser refuses to persist (private mode / full quota). */
  persistenceIsDurable: boolean
  completeOnboarding: (draft: OnboardingDraft) => Workspace
  updateWorkspace: (patch: WorkspacePatch) => void
  resetWorkspace: () => void
  exportWorkspace: () => string
  /** Locale + currency context every formatter in the app consumes. */
  format: FormatContext
}

/**
 * Kept in its own module, away from the provider component, so the context
 * identity survives hot reloads of the provider and of anything it imports.
 */
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used inside <WorkspaceProvider>.')
  }
  return context
}

/** Convenience hook for screens that only render once onboarding is done. */
export function useReadyWorkspace(): Workspace {
  const { workspace } = useWorkspace()
  if (!workspace) {
    throw new Error('useReadyWorkspace called before onboarding completed.')
  }
  return workspace
}
