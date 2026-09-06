import { NavLink, Outlet } from 'react-router-dom'
import { SETTINGS_NAV } from '@/components/layout/navigation'
import { cn } from '@/lib/cn'

export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <aside className="lg:w-56 lg:shrink-0">
        <p className="pb-3 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Workspace
        </p>
        <nav>
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {SETTINGS_NAV.map((item) => (
              <li key={item.to} className="shrink-0">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'block whitespace-nowrap rounded-field px-3 py-2 text-body transition-colors duration-150',
                      isActive
                        ? 'bg-raised text-ink'
                        : 'text-ink-muted hover:bg-raised/60 hover:text-ink',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 pb-10 lg:max-w-2xl">
        <Outlet />
      </div>
    </div>
  )
}
