import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import type { CustomerStat } from '@/domain/metrics/customers'
import type { FunnelStageStat, StageConversion } from '@/domain/metrics/funnel'
import type { CommercialHealth } from '@/domain/health/commercialHealth'
import type { Insight } from '@/domain/intelligence/types'
import type { ScoredOpportunity } from '@/domain/intelligence/opportunityScoring'
import type { ForecastReport } from '@/domain/forecast/types'
import type { RepMetrics } from '@/domain/metrics/teamMetrics'
import type { CustomRange, ReportPeriod, ReportPeriodKey } from './reportPeriods'

/**
 * A report is a document assembled from figures the product has already
 * calculated. Nothing in this module defines revenue, pipeline, win rate,
 * forecast or health - it selects, orders and narrates what the shared engines
 * produced, so a number in a report and the same number on screen cannot
 * disagree.
 */
export type ReportType =
  | 'executive'
  | 'performance'
  | 'pipeline'
  | 'forecast'
  | 'team'
  | 'intelligence'

export interface ReportTypeDefinition {
  value: ReportType
  label: string
  description: string
  /** Sections switched on when this type is chosen. */
  sections: ReportSectionKey[]
}

export type ReportSectionKey =
  | 'summary'
  | 'kpis'
  | 'revenue'
  | 'funnel'
  | 'pipeline'
  | 'team'
  | 'forecast'
  | 'intelligence'
  | 'highlights'
  | 'customers'

export interface ReportSectionDefinition {
  key: ReportSectionKey
  label: string
  description: string
}

export const REPORT_SECTIONS: ReportSectionDefinition[] = [
  { key: 'summary', label: 'Executive Summary', description: 'The period in a paragraph' },
  { key: 'kpis', label: 'Key Performance Indicators', description: 'Headline figures against the previous period' },
  { key: 'revenue', label: 'Revenue Performance', description: 'Revenue against target over the period' },
  { key: 'funnel', label: 'Sales Funnel', description: 'Stage-by-stage conversion for the cohort' },
  { key: 'pipeline', label: 'Pipeline', description: 'Coverage, stage mix and the leading opportunities' },
  { key: 'team', label: 'Sales Team', description: 'Performance by representative' },
  { key: 'forecast', label: 'Forecast', description: 'Scenarios, confidence and the path to target' },
  { key: 'intelligence', label: 'Commercial Intelligence', description: 'Health, risks and recommended actions' },
  { key: 'highlights', label: 'Management Highlights', description: 'What went well, what needs attention' },
  { key: 'customers', label: 'Customer Analysis', description: 'Revenue concentration by account' },
]

export const REPORT_TYPES: ReportTypeDefinition[] = [
  {
    value: 'executive',
    label: 'Executive Commercial Report',
    description: 'The full picture: where the period landed, where it is going, what needs attention.',
    sections: [
      'summary',
      'kpis',
      'revenue',
      'funnel',
      'pipeline',
      'team',
      'forecast',
      'intelligence',
      'highlights',
    ],
  },
  {
    value: 'performance',
    label: 'Monthly Performance Report',
    description: 'Revenue, conversion and team delivery against the commitment.',
    sections: ['summary', 'kpis', 'revenue', 'funnel', 'team', 'highlights'],
  },
  {
    value: 'pipeline',
    label: 'Pipeline Report',
    description: 'Coverage, stage mix and the opportunities carrying the period.',
    sections: ['summary', 'kpis', 'pipeline', 'funnel'],
  },
  {
    value: 'forecast',
    label: 'Forecast Report',
    description: 'Scenarios, confidence and what would have to happen to reach target.',
    sections: ['summary', 'kpis', 'forecast', 'pipeline'],
  },
  {
    value: 'team',
    label: 'Sales Team Report',
    description: 'Performance by representative against their own targets.',
    sections: ['summary', 'kpis', 'team', 'highlights'],
  },
  {
    value: 'intelligence',
    label: 'Intelligence & Risk Report',
    description: 'Commercial health, exposure, anomalies and recommended actions.',
    sections: ['summary', 'intelligence', 'highlights', 'pipeline'],
  },
]

export interface ReportConfig {
  type: ReportType
  period: ReportPeriodKey
  custom?: CustomRange
  /** Sections the director has switched on. */
  sections: ReportSectionKey[]
  /** Null for the whole team. */
  ownerId: string | null
}

// ---------------------------------------------------------------------------
// The assembled document
// ---------------------------------------------------------------------------

export interface ReportKpi {
  key: string
  label: string
  value: string
  /** The same figure one period back, when there is one. */
  previous: string | null
  /** Signed change, already formatted. */
  change: string | null
  /** Relative change, already formatted. Null when it cannot be expressed. */
  changePercent: string | null
  direction: 'up' | 'down' | 'flat' | 'none'
  /** True when a rise is bad, e.g. sales cycle length. */
  inverted?: boolean
}

export interface ReportRevenuePoint {
  label: string
  revenue: number
  cumulative: number
  target: number
}

export interface ReportHighlight {
  text: string
  detail: string | null
}

export interface ReportHighlights {
  positive: ReportHighlight[]
  attention: ReportHighlight[]
  actions: ReportHighlight[]
}

/** A section the report could not build, and the honest reason why. */
export interface ReportGap {
  section: ReportSectionKey
  message: string
}

export interface ReportMeta {
  companyName: string
  logo: string | null
  directorName: string
  directorTitle: string
  currency: string
  locale: string
  periodTitle: string
  periodLabel: string
  /** ISO timestamp the document was assembled. */
  generatedAt: string
  ownerName: string | null
  isComplete: boolean
}

export interface ReportDocument {
  config: ReportConfig
  meta: ReportMeta
  period: ReportPeriod
  typeLabel: string

  metrics: CommercialMetrics
  forecast: ForecastReport
  health: CommercialHealth
  insights: Insight[]
  scored: ScoredOpportunity[]
  reps: RepMetrics[]
  customers: CustomerStat[]

  summary: string[]
  kpis: ReportKpi[]
  revenueSeries: ReportRevenuePoint[]
  funnel: FunnelStageStat[]
  conversions: StageConversion[]
  highlights: ReportHighlights
  /** Sections that could not be built, with a reason. Never fabricated. */
  gaps: ReportGap[]
  /** Sections actually present, in document order. */
  sections: ReportSectionKey[]
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export type ReportFormat = 'pdf' | 'csv' | 'print' | 'preview'

/**
 * A history entry stores the *configuration*, not the rendered document.
 *
 * Re-opening one re-runs the engines over live data, which is the honest
 * behaviour: a report of last month reproduces exactly, and a report of this
 * month reflects where the period actually stands now rather than a stale copy.
 */
export interface SavedReport {
  id: string
  name: string
  type: ReportType
  typeLabel: string
  periodTitle: string
  config: ReportConfig
  createdAt: string
  format: ReportFormat
  company: string
  /** What the report said when it was generated, for a quick glance. */
  snapshot: {
    revenue: number
    target: number
    forecast: number
    attainment: number | null
  }
}
