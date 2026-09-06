import type { ReactNode } from 'react'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Centre-screen dialog, used for confirmations and short forms.
 *
 * Escape and the backdrop both close it, focus is trapped while it is open and
 * returned to whatever opened it on close.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const panelRef = useDialogFocus<HTMLDivElement>(open, onClose)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-overlay/80 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md animate-scale-in rounded-sheet border border-line bg-surface p-6 shadow-pop',
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-ink-subtle transition-colors hover:bg-raised hover:text-ink"
        >
          <X className="size-4" />
        </button>
        <h2 className="pr-8 text-base font-medium tracking-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-2 text-body leading-relaxed text-ink-muted">{description}</p>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}
