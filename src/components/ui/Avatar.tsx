import { avatarAccent } from '@/data/catalogs'
import { cn } from '@/lib/cn'

export interface AvatarProps {
  initials: string
  accent?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  imageUrl?: string | null
}

const sizes = {
  sm: 'size-7 text-2xs',
  md: 'size-9 text-xs',
  lg: 'size-12 text-sm',
}

export function Avatar({
  initials,
  accent = 0,
  size = 'md',
  className,
  imageUrl,
}: AvatarProps) {
  const palette = avatarAccent(accent)

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn(
          'shrink-0 rounded-[10px] border border-line object-cover',
          sizes[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] font-semibold tracking-wide',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {initials}
    </span>
  )
}
