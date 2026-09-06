import type { ReactNode } from 'react'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Rendered in the header, right of the title. */
  headerAction?: ReactNode
  /** Sticky footer, for the primary and destructive actions. */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Right-hand side panel.
 *
 * Chosen over a modal for deal detail and editing: the board stays visible
 * behind it, so working through a column does not feel like a sequence of
 * full-screen interruptions. Escape and the backdrop both close it, and focus
 * is trapped inside while it is open and returned to the opener on close.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  headerAction,
  footer,
  children,
  className,
}: DrawerProps) {
  const panelRef = useDialogFocus<HTMLElement>(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 animate-fade-in bg-overlay/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex h-full w-full max-w-[460px] animate-slide-in-right flex-col border-l border-line bg-surface shadow-pop',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-title font-medium tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p className="truncate text-xs text-ink-subtle">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-field p-1.5 text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  )
}
