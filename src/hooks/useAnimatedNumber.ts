import { useEffect, useRef, useState } from 'react'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Eases a figure towards its target value.
 *
 * Used for the executive KPIs so a filter change reads as the number moving
 * rather than snapping. It runs once per change and then stops - nothing here
 * animates continuously, and reduced-motion users get the value immediately.
 *
 * Correctness never depends on the animation: the first render is the true
 * value, and a timer guarantees the final value is shown even if animation
 * frames never run (a background tab pauses them, and a throttled renderer can
 * stall them). An eased number that quietly sticks at the previous figure would
 * be worse than no animation at all.
 */
export function useAnimatedNumber(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target)
  const displayRef = useRef(target)
  const fromRef = useRef(target)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    const from = fromRef.current

    const settle = () => {
      fromRef.current = target
      displayRef.current = target
      setDisplay(target)
    }

    if (!Number.isFinite(target) || from === target || prefersReducedMotion()) {
      settle()
      return
    }

    const startedAt = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - (1 - progress) ** 3
      const next = from + (target - from) * eased
      displayRef.current = next
      setDisplay(next)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        frameRef.current = null
        fromRef.current = target
      }
    }

    frameRef.current = requestAnimationFrame(step)

    // Backstop: whatever happens to the frames, land on the real value.
    const backstop = window.setTimeout(() => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      settle()
    }, duration + 150)

    return () => {
      window.clearTimeout(backstop)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      // Resume from whatever was last painted, so an interrupted run is smooth.
      fromRef.current = displayRef.current
    }
  }, [target, duration])

  return display
}
