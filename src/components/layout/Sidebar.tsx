import { NavLink } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { directorFullName, directorInitials } from '@/domain/workspace'
import { Avatar } from '@/components/ui/Avatar'
import { BrandLockup } from './BrandMark'
import { PRIMARY_NAV } from './navigation'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const workspace = useReadyWorkspace()

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex h-16 items-center border-b border-line px-5">
        <BrandLockup />
      </div>

      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <Avatar
            initials={workspace.company.name.slice(0, 2).toUpperCase()}
            accent={3}
            imageUrl={workspace.company.logo}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-body font-medium text-ink">
              {workspace.company.name}
            </p>
            <p className="truncate text-2xs text-ink-subtle">{workspace.company.sector}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Command center
        </p>
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-field px-2.5 py-2 text-body transition-colors duration-150',
                    isActive
                      ? 'bg-raised text-ink'
                      : 'text-ink-muted hover:bg-raised/60 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'size-4 shrink-0 transition-colors',
                        isActive ? 'text-accent' : 'text-ink-subtle group-hover:text-ink-muted',
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <NavLink
          to="/settings/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-field px-2.5 py-2 text-body transition-colors duration-150',
              isActive
                ? 'bg-raised text-ink'
                : 'text-ink-muted hover:bg-raised/60 hover:text-ink',
            )
          }
        >
          <Settings className="size-4 shrink-0 text-ink-subtle" />
          Settings
        </NavLink>

        <div className="mt-2 flex items-center gap-3 rounded-field border border-line bg-elevated px-2.5 py-2.5">
          <Avatar initials={directorInitials(workspace.director)} accent={0} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">
              {directorFullName(workspace.director)}
            </p>
            <p className="truncate text-2xs text-ink-subtle">
              {workspace.director.jobTitle}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
