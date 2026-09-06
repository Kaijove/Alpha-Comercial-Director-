import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage'
import { IntelligencePage } from '@/features/intelligence/IntelligencePage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { ForecastPage } from '@/features/forecast/ForecastPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { PipelinePage } from '@/features/pipeline/PipelinePage'
import { TeamPage } from '@/features/team/TeamPage'
import { SettingsLayout } from '@/features/settings/SettingsLayout'
import { CompanySection } from '@/features/settings/sections/CompanySection'
import { DataSection } from '@/features/settings/sections/DataSection'
import { GoalsSection } from '@/features/settings/sections/GoalsSection'
import { PreferencesSection } from '@/features/settings/sections/PreferencesSection'
import { ProfileSection } from '@/features/settings/sections/ProfileSection'
import { TeamSection } from '@/features/settings/sections/TeamSection'
import { NotFoundPage } from '@/features/placeholder/NotFoundPage'
import { useWorkspace } from './providers/workspaceContext'

/** Nothing inside the shell renders until a workspace exists. */
function RequireWorkspace({ children }: { children: ReactNode }) {
  const { isOnboarded } = useWorkspace()
  const location = useLocation()

  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** A configured director should never land back in setup by accident. */
function RedirectIfOnboarded({ children }: { children: ReactNode }) {
  const { isOnboarded } = useWorkspace()
  if (isOnboarded) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <RedirectIfOnboarded>
            <OnboardingPage />
          </RedirectIfOnboarded>
        }
      />

      <Route
        element={
          <RequireWorkspace>
            <AppShell />
          </RequireWorkspace>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/intelligence" element={<IntelligencePage />} />

        <Route path="/pipeline" element={<PipelinePage />} />

        <Route path="/forecast" element={<ForecastPage />} />

        <Route path="/reports" element={<ReportsPage />} />

        <Route path="/team" element={<TeamPage />} />

        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<ProfileSection />} />
          <Route path="company" element={<CompanySection />} />
          <Route path="goals" element={<GoalsSection />} />
          <Route path="team" element={<TeamSection />} />
          <Route path="preferences" element={<PreferencesSection />} />
          <Route path="data" element={<DataSection />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
