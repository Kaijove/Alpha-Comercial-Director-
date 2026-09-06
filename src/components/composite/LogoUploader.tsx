import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const MAX_BYTES = 400 * 1024

export interface LogoUploaderProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  companyName: string
  className?: string
}

/**
 * Stores the logo as a data URL inside the workspace. Deliberately capped so a
 * large upload can never blow the localStorage quota.
 */
export function LogoUploader({
  value,
  onChange,
  companyName,
  className,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Keep the logo under 400 KB so it stays inside your browser storage.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setError(null)
      onChange(typeof reader.result === 'string' ? reader.result : null)
    }
    reader.onerror = () => setError('That image could not be read.')
    reader.readAsDataURL(file)
  }

  const initials = companyName.trim().slice(0, 2).toUpperCase() || 'CO'

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-panel border',
            value ? 'border-line bg-elevated' : 'border-dashed border-line-strong bg-elevated',
          )}
        >
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-sm font-semibold tracking-wide text-ink-faint">
              {initials}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              iconLeft={<ImagePlus className="size-3.5" />}
            >
              {value ? 'Replace logo' : 'Upload logo'}
            </Button>
            {value ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onChange(null)
                  setError(null)
                }}
                iconLeft={<Trash2 className="size-3.5" />}
              >
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-ink-subtle">PNG or SVG, square works best. Max 400 KB.</p>
        </div>
      </div>

      {error ? <p className="text-xs text-negative">{error}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
    </div>
  )
}
