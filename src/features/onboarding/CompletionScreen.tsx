import { useEffect, useState } from 'react'

const LINES = [
  'Calibrating targets',
  'Preparing your team view',
  'Opening the command center',
]

/**
 * The hand-off between setup and the dashboard. It runs for a fixed beat so the
 * transition reads as deliberate rather than as a flash of unstyled routing.
 */
export function CompletionScreen({
  companyName,
  onDone,
}: {
  companyName: string
  onDone: () => void
}) {
  const [line, setLine] = useState(0)

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setLine(1), 750),
      window.setTimeout(() => setLine(2), 1450),
      window.setTimeout(onDone, 2250),
    ]
    return () => timers.forEach(window.clearTimeout)
  }, [onDone])

  return (
    <div className="ambient flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="animate-scale-in">
        <span className="relative inline-flex size-16 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full bg-accent/20 blur-xl"
            style={{ animation: 'var(--animate-halo)' }}
            aria-hidden
          />
          <svg viewBox="0 0 48 48" className="relative size-16" aria-hidden>
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="var(--color-line-strong)"
              strokeWidth="1.5"
            />
            <path
              d="M15 24.5l6 6 12-13"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="48"
              style={{ animation: 'var(--animate-draw)' }}
            />
          </svg>
        </span>
      </div>

      <h1
        className="mt-8 text-balance text-metric-lg font-semibold leading-tight tracking-tight text-ink"
        style={{ animation: 'var(--animate-rise)', animationDelay: '120ms' }}
      >
        Your workspace is ready.
      </h1>
      <p
        className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted"
        style={{ animation: 'var(--animate-rise)', animationDelay: '220ms' }}
      >
        {companyName} is now wired into your command center.
      </p>

      <p className="mt-10 h-5 text-xs tracking-wide text-ink-faint">
        <span key={line} className="animate-fade-in inline-block">
          {LINES[line]}
        </span>
      </p>
    </div>
  )
}
