import type { Activity, CommercialDataset } from '@/domain/commerce'
import type { Workspace } from '@/domain/workspace'
import { directorFullName } from '@/domain/workspace'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { customerStats } from '@/domain/metrics/customers'
import type { RepMetrics } from '@/domain/metrics/teamMetrics'
import { buildFunnel, stageConversions } from '@/domain/metrics/funnel'
import { runIntelligence } from '@/domain/intelligence/intelligenceEngine'
import type { IntelligenceFormatters } from '@/domain/intelligence/context'
import type { InsightStatus } from '@/domain/intelligence/types'
import { buildHighlights } from './highlightsEngine'
import { generateExecutiveSummary } from './summaryGenerator'
import { resolveReportPeriod, type ReportPeriod } from './reportPeriods'
import {
  REPORT_TYPES,
  type ReportConfig,
  type ReportDocument,
  type ReportGap,
  type ReportKpi,
  type ReportRevenuePoint,
  type ReportSectionKey,
} from './types'

/**
 * The report engine.
 *
 *   config -> shared engines -> ReportDocument -> preview / print / export
 *
 * Nothing here calculates a business figure. The period is resolved, the shared
 * metrics layer is asked for a snapshot, the intelligence engine is asked for
 * insights, and the forecast arrives on `metrics.forecast` exactly as it does
 * on the Dashboard. This module then selects, orders and narrates.
 *
 * That is what makes the report trustworthy: if the Dashboard says 382k, the
 * report says 382k, because it is the same call.
 */
export interface ReportInput {
  config: ReportConfig
  dataset: CommercialDataset
  workspace: Workspace
  now: Date
  fmt: IntelligenceFormatters
  activitiesFor: (opportunityId: string) => Activity[]
  customerName: (id: string) => string
  ownerName: (id: string) => string
  statuses: Record<string, InsightStatus>
}

export function buildReport(input: ReportInput): ReportDocument {
  const { config, dataset, workspace, now, fmt } = input

  const period = resolveReportPeriod(config.period, now, config.custom)

  // One snapshot, from the same function every screen uses. The forecast rides
  // along on `metrics.forecast`.
  const metrics = computeCommercialMetrics(dataset, workspace, period, config.ownerId)
  const forecast = metrics.forecast

  const intelligence = runIntelligence({
    dataset,
    workspace,
    metrics,
    now: period.now,
    fmt,
    statuses: input.statuses,
    activitiesFor: input.activitiesFor,
    customerName: input.customerName,
    ownerName: input.ownerName,
  })

  // Same rep figures the Team page and the Dashboard read, not a third pass.
  const reps = metrics.reps
  const customers = customerStats(dataset.opportunities, dataset.customers, period)

  const funnel = buildFunnel(dataset.opportunities, period)
  const conversions = stageConversions(dataset.opportunities, period, period.previous)

  const summary = generateExecutiveSummary({
    metrics,
    forecast,
    health: intelligence.health,
    insights: intelligence.insights,
    period,
    fmt,
  })

  const highlights = buildHighlights({
    metrics,
    forecast,
    insights: intelligence.insights,
    reps,
    customers,
    fmt,
  })

  const owner = config.ownerId
    ? (dataset.owners.find((entry) => entry.id === config.ownerId) ?? null)
    : null

  const definition = REPORT_TYPES.find((entry) => entry.value === config.type)!

  const gaps = findGaps({
    config,
    period,
    metrics,
    customers,
    reps,
    funnelHasCohort: funnel[0]?.entered > 0,
  })

  // Only sections the director asked for, in the canonical document order, and
  // never one the data could not support.
  const missing = new Set(gaps.map((gap) => gap.section))
  const sections = DOCUMENT_ORDER.filter(
    (key) => config.sections.includes(key) && !missing.has(key),
  )

  return {
    config,
    period,
    typeLabel: definition.label,
    meta: {
      companyName: workspace.company.name,
      logo: workspace.company.logo,
      directorName: directorFullName(workspace.director),
      directorTitle: workspace.director.jobTitle,
      currency: workspace.company.currency,
      locale: workspace.preferences.locale,
      periodTitle: period.title,
      periodLabel: period.label,
      generatedAt: now.toISOString(),
      ownerName: owner?.name ?? null,
      isComplete: period.isComplete,
    },
    metrics,
    forecast,
    health: intelligence.health,
    insights: intelligence.insights,
    scored: intelligence.scored,
    reps,
    customers,
    summary,
    kpis: buildKpis(metrics, fmt, period.isComplete),
    revenueSeries: buildRevenueSeries(dataset, period, metrics.target),
    funnel,
    conversions,
    highlights,
    gaps,
    sections,
  }
}

/** The order sections appear in a document, whatever order they were enabled. */
const DOCUMENT_ORDER: ReportSectionKey[] = [
  'summary',
  'kpis',
  'revenue',
  'funnel',
  'pipeline',
  'team',
  'forecast',
  'intelligence',
  'customers',
  'highlights',
]

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

function buildKpis(
  metrics: ReturnType<typeof computeCommercialMetrics>,
  fmt: IntelligenceFormatters,
  isComplete: boolean,
): ReportKpi[] {
  const money = (value: number | null) => (value === null ? '—' : fmt.currency(value))

  const change = (
    current: number | null,
    previous: number | null,
    format: (value: number) => string,
  ): Pick<ReportKpi, 'previous' | 'change' | 'changePercent' | 'direction'> => {
    if (current === null || previous === null || previous === 0) {
      return { previous: previous === null ? null : format(previous), change: null, changePercent: null, direction: 'none' }
    }
    const delta = current - previous
    const ratio = delta / Math.abs(previous)
    return {
      previous: format(previous),
      change: `${delta >= 0 ? '+' : '−'}${format(Math.abs(delta))}`,
      changePercent: `${delta >= 0 ? '+' : '−'}${fmt.percent(Math.abs(ratio), 1)}`,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    }
  }

  const kpis: ReportKpi[] = [
    {
      key: 'revenue',
      label: 'Revenue',
      value: fmt.currency(metrics.revenue),
      ...change(metrics.revenue, metrics.previousRevenue, fmt.currency),
    },
    {
      key: 'target',
      label: 'Target',
      value: fmt.currency(metrics.target),
      previous: null,
      change: null,
      changePercent: null,
      direction: 'none',
    },
    {
      key: 'attainment',
      label: 'Attainment',
      value: metrics.attainment !== null ? fmt.percent(metrics.attainment, 1) : '—',
      previous: null,
      change: null,
      changePercent: null,
      direction:
        metrics.attainment === null ? 'none' : metrics.attainment >= 1 ? 'up' : 'down',
    },
    {
      key: 'growth',
      label: 'Growth',
      value:
        metrics.revenueDelta !== null
          ? `${metrics.revenueDelta >= 0 ? '+' : '−'}${fmt.percent(Math.abs(metrics.revenueDelta), 1)}`
          : '—',
      previous: metrics.previousRevenue > 0 ? fmt.currency(metrics.previousRevenue) : null,
      change: null,
      changePercent: null,
      direction:
        metrics.revenueDelta === null ? 'none' : metrics.revenueDelta >= 0 ? 'up' : 'down',
    },
    // A period that has already closed has no forecast worth printing: the
    // number is the result. Labelling a finished month "base forecast" next to
    // a section that says the forecast is not shown would be two answers to one
    // question.
    isComplete
      ? {
          key: 'result',
          label: 'Result vs target',
          value:
            metrics.target > 0
              ? `${metrics.revenue - metrics.target >= 0 ? '+' : '−'}${fmt.currency(Math.abs(metrics.revenue - metrics.target))}`
              : '—',
          previous: null,
          change: 'Final, not a projection',
          changePercent: null,
          direction: metrics.revenue >= metrics.target ? 'up' : 'down',
        }
      : {
          key: 'forecast',
          label: 'Base forecast',
          value: fmt.currency(metrics.forecast.value),
          previous: null,
          change:
            metrics.target > 0
              ? `${metrics.forecast.gap >= 0 ? '+' : '−'}${fmt.currency(Math.abs(metrics.forecast.gap))} vs target`
              : null,
          changePercent:
            metrics.forecast.attainment !== null
              ? fmt.percent(metrics.forecast.attainment, 1)
              : null,
          direction: metrics.forecast.gap >= 0 ? 'up' : 'down',
        },
    {
      key: 'pipeline',
      label: 'Open pipeline',
      value: fmt.currency(metrics.pipelineTotal),
      previous: null,
      change: `${fmt.currency(metrics.weightedPipeline)} weighted`,
      changePercent:
        metrics.coverage !== null ? `${fmt.number(metrics.coverage, 1)}x coverage` : null,
      direction: 'none',
    },
    {
      key: 'winRate',
      label: 'Win rate',
      value: metrics.winRate !== null ? fmt.percent(metrics.winRate, 1) : '—',
      ...change(metrics.winRate, metrics.previousWinRate, (value) => fmt.percent(value, 1)),
    },
    {
      key: 'averageDeal',
      label: 'Average deal size',
      value: money(metrics.averageDealSize),
      ...change(metrics.averageDealSize, metrics.previousAverageDealSize, fmt.currency),
    },
  ]

  return kpis
}

// ---------------------------------------------------------------------------
// Revenue series: real won deals bucketed inside the period
// ---------------------------------------------------------------------------

function buildRevenueSeries(
  dataset: CommercialDataset,
  period: ReportPeriod,
  target: number,
): ReportRevenuePoint[] {
  // Weekly buckets for a month, monthly for anything longer: enough resolution
  // to show shape, few enough bars to stay readable on an A4 page.
  const useWeeks = period.totalDays <= 45
  const buckets: { label: string; start: Date; end: Date }[] = []

  if (useWeeks) {
    let cursor = new Date(period.start)
    let index = 1
    while (cursor <= period.end) {
      const end = new Date(cursor)
      end.setDate(end.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      buckets.push({
        label: `Week ${index}`,
        start: new Date(cursor),
        end: end > period.end ? new Date(period.end) : end,
      })
      cursor = new Date(end)
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      index += 1
    }
  } else {
    const cursor = new Date(period.start.getFullYear(), period.start.getMonth(), 1)
    while (cursor <= period.end) {
      const start = new Date(cursor)
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
      buckets.push({
        label: MONTHS_SHORT[start.getMonth()],
        start: start < period.start ? new Date(period.start) : start,
        end: end > period.end ? new Date(period.end) : end,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  const won = dataset.opportunities.filter((o) => o.stage === 'won' && o.closedAt !== null)
  const perBucketTarget = buckets.length > 0 ? target / buckets.length : 0

  let cumulative = 0
  return buckets.map((bucket, index) => {
    const revenue = won
      .filter((o) => {
        const closed = new Date(o.closedAt as string)
        return closed >= bucket.start && closed <= bucket.end
      })
      .reduce((total, o) => total + o.value, 0)
    cumulative += revenue
    return {
      label: bucket.label,
      revenue,
      cumulative,
      target: perBucketTarget * (index + 1),
    }
  })
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---------------------------------------------------------------------------
// Gaps: what the data could not support, stated rather than invented
// ---------------------------------------------------------------------------

interface GapInput {
  config: ReportConfig
  period: ReportPeriod
  metrics: ReturnType<typeof computeCommercialMetrics>
  customers: ReturnType<typeof customerStats>
  reps: RepMetrics[]
  funnelHasCohort: boolean
}

function findGaps({
  config,
  period,
  metrics,
  customers,
  reps,
  funnelHasCohort,
}: GapInput): ReportGap[] {
  const gaps: ReportGap[] = []
  const wants = (section: ReportSectionKey) => config.sections.includes(section)

  if (wants('customers') && customers.filter((entry) => entry.revenue > 0).length === 0) {
    gaps.push({
      section: 'customers',
      message: 'Customer analysis is unavailable: no account booked revenue in this period.',
    })
  }

  if (wants('team') && reps.length === 0) {
    gaps.push({
      section: 'team',
      message:
        'Team performance is unavailable: no sales representatives are configured in this workspace.',
    })
  }

  if (wants('funnel') && !funnelHasCohort) {
    gaps.push({
      section: 'funnel',
      message:
        'Sales funnel is unavailable: no opportunities entered the funnel inside this period.',
    })
  }

  if (wants('revenue') && metrics.revenue === 0 && metrics.previousRevenue === 0) {
    gaps.push({
      section: 'revenue',
      message: 'Revenue performance is unavailable: no deals were won in this period or the one before it.',
    })
  }

  if (wants('pipeline') && metrics.openCount === 0) {
    gaps.push({
      section: 'pipeline',
      message: 'Pipeline analysis is unavailable: there are no open opportunities.',
    })
  }

  if (wants('forecast') && period.isComplete) {
    gaps.push({
      section: 'forecast',
      message:
        'Forecast outlook is not shown for a period that has already closed: the revenue figures above are final.',
    })
  }

  return gaps
}
