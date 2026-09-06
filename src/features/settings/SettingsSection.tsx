import type { FormEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export interface SettingsSectionProps {
  title: string
  description?: string
  children: ReactNode
  /** Omit the save bar for sections that apply changes immediately. */
  dirty?: boolean
  onSave?: () => void
  onDiscard?: () => void
  saveLabel?: string
  className?: string
}

export function SettingsSection({
  title,
  description,
  children,
  dirty = false,
  onSave,
  onDiscard,
  saveLabel = 'Save changes',
  className,
}: SettingsSectionProps) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (dirty) onSave?.()
  }

  return (
    <form onSubmit={handleSubmit} className={cn('animate-fade-in', className)}>
      <header className="space-y-1.5">
        <h1 className="text-section font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="max-w-xl text-body leading-relaxed text-ink-muted">{description}</p>
        ) : null}
      </header>

      <div className="mt-7">{children}</div>

      {onSave ? (
        <footer
          className={cn(
            'mt-8 flex items-center justify-end gap-2 border-t border-line pt-5',
            'transition-opacity duration-200',
            dirty ? 'opacity-100' : 'pointer-events-none opacity-40',
          )}
        >
          <span className="mr-auto text-xs text-ink-faint">
            {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
          </span>
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={!dirty}>
            Discard
          </Button>
          <Button type="submit" variant="primary" disabled={!dirty}>
            {saveLabel}
          </Button>
        </footer>
      ) : null}
    </form>
  )
}
