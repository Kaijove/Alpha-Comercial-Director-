import { useLocation } from 'react-router-dom'
import { Database, Menu } from 'lucide-react'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { formatDate } from '@/lib/format'
import { PRIMARY_NAV } from './navigation'

function usePageTitle(): string {
  const { pathname } = useLocation()
  if (pathname.startsWith('/settings')) return 'Settings'
  const match = PRIMARY_NAV.find((item) => pathname.startsWith(item.to))
  return match?.label ?? 'Overview'
}

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const workspace = useReadyWorkspace()
  const title = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 rounded-field p-2 text-ink-muted transition-colors hover:bg-raised hover:text-ink lg:hidden"
        >
          <Menu className="size-4" />
        </button>
        {/* Context, not the document heading: the page below owns the h1. */}
        <p className="text-sm font-medium tracking-tight text-ink">{title}</p>
        <span className="hidden h-3.5 w-px bg-line sm:block" aria-hidden />
        <span className="hidden text-xs text-ink-faint sm:inline">
          {formatDate(new Date(), workspace.preferences.locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full border border-line bg-elevated px-2.5 py-1 text-2xs text-ink-subtle sm:inline-flex">
          <Database className="size-3" aria-hidden />
          Local workspace
        </span>
      </div>
    </header>
  )
}
