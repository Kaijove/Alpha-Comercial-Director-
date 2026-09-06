import { useAnimatedNumber } from '@/hooks/useAnimatedNumber'

export interface AnimatedNumberProps {
  value: number
  /** Formatter applied on every frame, e.g. the compact currency formatter. */
  format: (value: number) => string
  /** Exact figure surfaced on hover, so precision is available on demand. */
  title?: string
  className?: string
}

/**
 * A figure that eases to its value instead of snapping.
 *
 * The `title` carries the exact amount, which keeps the headline compact
 * (450.000 EUR) while precision stays one hover away.
 */
export function AnimatedNumber({ value, format, title, className }: AnimatedNumberProps) {
  const display = useAnimatedNumber(value)
  return (
    <span className={className} title={title}>
      {format(display)}
    </span>
  )
}
