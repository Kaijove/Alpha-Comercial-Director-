import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink font-medium shadow-accent hover:bg-accent-hover active:translate-y-px disabled:bg-accent/40 disabled:text-accent-ink/70 disabled:shadow-none',
  secondary:
    'bg-raised text-ink border border-line hover:border-line-strong hover:bg-elevated active:translate-y-px',
  ghost: 'text-ink-muted hover:text-ink hover:bg-raised',
  danger:
    'text-negative border border-negative/25 bg-negative/5 hover:bg-negative/12 hover:border-negative/40',
  link: 'text-accent hover:text-accent-hover underline-offset-4 hover:underline px-0',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    block = false,
    disabled,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-field whitespace-nowrap',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant !== 'link' && sizes[size],
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        iconLeft
      )}
      {children}
      {iconRight}
    </button>
  )
})
