import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { createId } from '@/lib/id'
import {
  ToastContext,
  type ToastContextValue,
  type ToastItem,
  type ToastTone,
} from './toastContext'

const toneStyles: Record<ToastTone, { icon: ReactNode; ring: string }> = {
  success: { icon: <Check className="size-3.5" />, ring: 'text-positive bg-positive/12' },
  info: { icon: <Info className="size-3.5" />, ring: 'text-accent bg-accent/12' },
  warning: {
    icon: <AlertTriangle className="size-3.5" />,
    ring: 'text-warning bg-warning/12',
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const notify = useCallback<ToastContextValue['notify']>(
    ({ title, description, tone = 'success' }) => {
      const id = createId('toast')
      setToasts((current) => [...current.slice(-2), { id, title, description, tone }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), 3600))
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-80 flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-rise rounded-field border border-line bg-elevated p-3.5 shadow-pop"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 inline-flex size-6 items-center justify-center rounded-full',
                  toneStyles[toast.tone].ring,
                )}
              >
                {toneStyles[toast.tone].icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium text-ink">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {toast.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
