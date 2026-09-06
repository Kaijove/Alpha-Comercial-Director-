import {
  BarChart3,
  Compass,
  FileText,
  LayoutDashboard,
  LineChart,
  Radar,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/pipeline', label: 'Pipeline', icon: Compass },
  { to: '/forecast', label: 'Forecast', icon: BarChart3 },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/intelligence', label: 'Intelligence', icon: Radar },
  { to: '/reports', label: 'Reports', icon: FileText },
]

export const SETTINGS_NAV = [
  { to: '/settings/profile', label: 'Your profile' },
  { to: '/settings/company', label: 'Company' },
  { to: '/settings/goals', label: 'Goals & currency' },
  { to: '/settings/team', label: 'Sales team' },
  { to: '/settings/preferences', label: 'Preferences' },
  { to: '/settings/data', label: 'Data & reset' },
]
