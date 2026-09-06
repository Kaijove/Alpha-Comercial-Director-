import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from '@/app/router'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { WorkspaceProvider } from '@/app/providers/WorkspaceProvider'
import { CommercialDataProvider } from '@/app/providers/CommercialDataProvider'
import { InsightStatusProvider } from '@/app/providers/InsightStatusProvider'
import { ToastProvider } from '@/components/ui/Toast'

export default function App() {
  return (
    <ErrorBoundary>
      {/* On react-router 7 the v6 `future` opt-ins are the default behaviour. */}
      <BrowserRouter>
        <WorkspaceProvider>
          <CommercialDataProvider>
            <InsightStatusProvider>
              <ToastProvider>
                <AppRouter />
              </ToastProvider>
            </InsightStatusProvider>
          </CommercialDataProvider>
        </WorkspaceProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
