import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside data-print="hide" className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar />
        </div>
      </aside>

      {navOpen ? (
        <div data-print="hide" className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-overlay/80 backdrop-blur-[2px]"
            onClick={() => setNavOpen(false)}
          />
          <div className="relative h-full w-64 animate-step-back">
            <Sidebar onNavigate={() => setNavOpen(false)} />
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute -right-11 top-4 rounded-field bg-elevated p-2 text-ink-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div data-print="hide">
          <Topbar onOpenNav={() => setNavOpen(true)} />
        </div>
        <main className="flex-1 px-5 py-8 lg:px-8 lg:py-10">
          <div className="mx-auto w-full max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
