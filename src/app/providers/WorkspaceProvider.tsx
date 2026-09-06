import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { draftRepository, workspaceRepository } from '@/data/repository'
import { localCommercialRepository } from '@/data/repository/commercialRepository'
import { WORKSPACE_KEY } from '@/data/repository/localRepository'
import { findCountry } from '@/data/catalogs'
import { DEFAULT_PREFERENCES, workspaceFromDraft } from '@/domain/defaults'
import type { OnboardingDraft, Workspace, WorkspacePatch } from '@/domain/workspace'
import { formatContextFrom } from '@/lib/format'
import { storageIsDurable, storageKey } from '@/lib/storage'
import {
  WorkspaceContext,
  type WorkspaceContextValue,
  type WorkspaceStatus,
} from './workspaceContext'

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    status: WorkspaceStatus
    workspace: Workspace | null
  }>(() => ({ status: 'ready', workspace: workspaceRepository.load() }))

  /** Keep every open tab of the command center in sync. */
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey(WORKSPACE_KEY)) return
      setState({ status: 'ready', workspace: workspaceRepository.load() })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const completeOnboarding = useCallback((draft: OnboardingDraft) => {
    const workspace = workspaceFromDraft(draft, {
      ...DEFAULT_PREFERENCES,
      locale: inferLocale(draft.company.country, DEFAULT_PREFERENCES.locale),
    })
    setState({ status: 'ready', workspace })
    workspaceRepository.save(workspace)
    draftRepository.clear()
    return workspace
  }, [])

  const updateWorkspace = useCallback((patch: WorkspacePatch) => {
    setState((previous) => {
      if (!previous.workspace) return previous
      const next: Workspace = {
        ...previous.workspace,
        director: { ...previous.workspace.director, ...patch.director },
        company: { ...previous.workspace.company, ...patch.company },
        goals: { ...previous.workspace.goals, ...patch.goals },
        team: patch.team ?? previous.workspace.team,
        preferences: { ...previous.workspace.preferences, ...patch.preferences },
        updatedAt: new Date().toISOString(),
      }
      workspaceRepository.save(next)
      return { status: 'ready', workspace: next }
    })
  }, [])

  const resetWorkspace = useCallback(() => {
    workspaceRepository.clear()
    draftRepository.clear()
    // The commercial dataset belongs to the workspace, so it goes with it.
    localCommercialRepository.clear()
    setState({ status: 'ready', workspace: null })
  }, [])

  const exportWorkspace = useCallback(
    () => JSON.stringify(state.workspace, null, 2),
    [state.workspace],
  )

  const value = useMemo<WorkspaceContextValue>(() => {
    const preferences = state.workspace?.preferences ?? DEFAULT_PREFERENCES
    const currency = state.workspace?.company.currency ?? 'EUR'
    return {
      status: state.status,
      workspace: state.workspace,
      isOnboarded: Boolean(state.workspace?.onboardingCompletedAt),
      persistenceIsDurable: storageIsDurable,
      completeOnboarding,
      updateWorkspace,
      resetWorkspace,
      exportWorkspace,
      format: formatContextFrom(preferences, currency),
    }
  }, [state, completeOnboarding, updateWorkspace, resetWorkspace, exportWorkspace])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

/**
 * Pick the locale used for every number and date: prefer the browser locale
 * when it already belongs to the selected country, otherwise use the country's
 * canonical locale from the catalog.
 */
function inferLocale(countryCode: string, fallback: string): string {
  if (!countryCode) return fallback
  const browser = typeof navigator !== 'undefined' ? navigator.language : ''
  if (browser && browser.toUpperCase().endsWith(`-${countryCode.toUpperCase()}`)) {
    return browser
  }
  return findCountry(countryCode)?.locale ?? fallback
}
