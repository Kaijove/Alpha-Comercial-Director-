import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'info' | 'warning'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

export interface ToastContextValue {
  notify: (toast: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastTone }) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>.')
  return context
}
