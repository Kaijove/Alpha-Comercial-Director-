import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Last line of defence. A corrupted workspace or a broken module should show a
 * recoverable screen, never a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CommandCenter] Unhandled error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="ambient flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-panel border border-line bg-surface p-7 text-center shadow-panel">
          <h1 className="text-section font-semibold tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-body leading-relaxed text-ink-muted">
            The command center hit an unexpected error. Reloading usually clears it. Your
            workspace stays saved in this browser.
          </p>
          <p className="mt-4 rounded-field border border-line bg-elevated px-3 py-2 text-left font-mono text-2xs leading-relaxed text-ink-subtle">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-10 w-full rounded-field bg-accent text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Reload the command center
          </button>
        </div>
      </div>
    )
  }
}
