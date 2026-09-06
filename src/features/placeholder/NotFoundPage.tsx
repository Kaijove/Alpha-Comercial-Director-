import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function NotFoundPage() {
  return (
    <div className="py-16">
      {/* The only heading on this route, so it is the page title. */}
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={<Compass className="size-4" />}
        title="This part of the command center does not exist yet"
        description="The route you followed is not wired to a module. Head back to the dashboard."
        action={
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center rounded-field bg-accent px-4 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Back to dashboard
          </Link>
        }
      />
    </div>
  )
}
