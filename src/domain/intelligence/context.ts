import type { CommercialDataset } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import type { CommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import type { CustomerStat } from '@/domain/metrics/customers'
import type { RepMetrics, TeamBenchmarks } from '@/domain/metrics/teamMetrics'
import type { ScoredOpportunity } from './opportunityScoring'

/**
 * Everything the rules are allowed to see.
 *
 * Assembled once by the engine from the shared metrics layer, so no rule ever
 * recomputes revenue, pipeline or win rate for itself - they all read the same
 * figures the Dashboard, Analytics and Team pages show.
 */
export interface IntelligenceFormatters {
  currency: (value: number) => string
  percent: (ratio: number, decimals?: number) => string
  /** Signed percentage points, e.g. "+4.2 pp". Shared with the coaching engine. */
  points: (ratio: number, decimals?: number) => string
  number: (value: number, decimals?: number) => string
  date: (value: string | Date) => string
  shortDate: (value: string | Date) => string
}

export interface IntelligenceContext {
  now: Date
  workspace: Workspace
  dataset: CommercialDataset
  /** Company-level figures for the current period. */
  metrics: CommercialMetrics
  /** Health and priority for every open deal. */
  scored: ScoredOpportunity[]
  reps: RepMetrics[]
  benchmarks: TeamBenchmarks
  customers: CustomerStat[]
  customerName: (id: string) => string
  ownerName: (id: string) => string
  fmt: IntelligenceFormatters
}

/** Percentage-point helper: rates are compared in points, never in percent. */
export const points = (
  fmt: IntelligenceFormatters,
  ratio: number,
  decimals = 1,
): string => `${fmt.number(Math.abs(ratio) * 100, decimals)} pp`
