import { STAGE_LABELS } from '@/domain/commerce'
import { HEALTH_BAND_LABELS } from '@/domain/intelligence/opportunityScoring'
import { CATEGORY_LABELS } from '@/domain/intelligence/types'
import type { ReportDocument } from './types'

/**
 * CSV export.
 *
 * Written by hand rather than by a library: a correct CSV is one escaping rule
 * and a join, and a dependency for that would be dead weight.
 *
 * The columns are the ones a director would actually put in front of someone -
 * names, values and dates - not internal ids. Numbers are written raw so a
 * spreadsheet treats them as numbers; dates are written ISO so they sort.
 */
export type CsvDataset =
  | 'opportunities'
  | 'team'
  | 'pipeline'
  | 'revenue'
  | 'forecast'
  | 'insights'

export const CSV_DATASETS: { value: CsvDataset; label: string; description: string }[] = [
  { value: 'opportunities', label: 'Opportunities', description: 'Every open deal with its forecast contribution' },
  { value: 'pipeline', label: 'Pipeline by stage', description: 'Count and value in each stage' },
  { value: 'team', label: 'Sales team', description: 'Revenue, target, attainment and pipeline per rep' },
  { value: 'revenue', label: 'Revenue', description: 'Revenue against target across the period' },
  { value: 'forecast', label: 'Forecast', description: 'Scenarios, confidence and probability' },
  { value: 'insights', label: 'Intelligence insights', description: 'Every signal with its priority and status' },
]

/**
 * One field, escaped.
 *
 * A field is quoted when it contains a separator, a quote or a newline, and an
 * embedded quote is doubled - which is the whole of RFC 4180 that matters here.
 * A leading `=`, `+`, `-` or `@` is prefixed with a quote character so a
 * spreadsheet treats it as text rather than as a formula.
 */
function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'number' ? String(value) : value

  const risky = /^[=+\-@\t\r]/.test(raw)
  const text = risky ? `'${raw}` : raw

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: (string | number | null)[][]): string {
  // A BOM so Excel opens UTF-8 correctly on Windows without an import wizard.
  return `﻿${rows.map((row) => row.map(escapeField).join(',')).join('\r\n')}\r\n`
}

const isoDate = (value: string | Date): string => {
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const round = (value: number) => Math.round(value * 100) / 100

export function buildCsv(
  dataset: CsvDataset,
  document: ReportDocument,
  names: { customer: (id: string) => string; owner: (id: string) => string },
): string {
  switch (dataset) {
    case 'opportunities':
      return toCsv([
        [
          'Opportunity',
          'Customer',
          'Owner',
          'Stage',
          'Value',
          'Probability',
          'Weighted Value',
          'Expected Close',
          'Health Score',
          'Health Band',
          'Forecast Contribution',
        ],
        ...document.forecast.contributions.map((entry) => [
          entry.opportunity.name,
          names.customer(entry.opportunity.customerId),
          names.owner(entry.opportunity.ownerId),
          STAGE_LABELS[entry.opportunity.stage],
          round(entry.value),
          round(entry.probability),
          round(entry.value * entry.probability),
          isoDate(entry.opportunity.expectedCloseDate),
          entry.health.score,
          HEALTH_BAND_LABELS[entry.health.band],
          round(entry.contribution),
        ]),
      ])

    case 'pipeline':
      return toCsv([
        ['Stage', 'Opportunities', 'Value', 'Weighted Value', 'Share of Pipeline'],
        ...document.metrics.stages.map((stage) => [
          STAGE_LABELS[stage.stage],
          stage.count,
          round(stage.value),
          round(stage.weighted),
          document.metrics.pipelineTotal > 0
            ? round(stage.value / document.metrics.pipelineTotal)
            : 0,
        ]),
      ])

    case 'team':
      return toCsv([
        [
          'Representative',
          'Role',
          'Revenue',
          'Target',
          'Attainment',
          'Open Pipeline',
          'Weighted Pipeline',
          'Coverage',
          'Win Rate',
          'Average Deal Size',
          'Won Deals',
          'Lost Deals',
          'Stalled Deals',
          'Forecast Contribution',
        ],
        ...document.reps.map((rep) => {
          const forecast = document.forecast.reps.find(
            (entry) => entry.ownerId === rep.owner.id,
          )
          return [
            rep.owner.name,
            rep.owner.role,
            round(rep.revenue),
            round(rep.target),
            rep.attainment !== null ? round(rep.attainment) : null,
            round(rep.pipeline),
            round(rep.weightedPipeline),
            rep.coverage !== null ? round(rep.coverage) : null,
            rep.winRate !== null ? round(rep.winRate) : null,
            rep.averageDealSize !== null ? round(rep.averageDealSize) : null,
            rep.wonCount,
            rep.lostCount,
            rep.stalledCount,
            forecast ? round(forecast.forecast) : null,
          ]
        }),
      ])

    case 'revenue':
      return toCsv([
        ['Period', 'Revenue', 'Cumulative Revenue', 'Cumulative Target'],
        ...document.revenueSeries.map((point) => [
          point.label,
          round(point.revenue),
          round(point.cumulative),
          round(point.target),
        ]),
      ])

    case 'forecast': {
      const { forecast, metrics } = document
      return toCsv([
        ['Measure', 'Value'],
        ['Closed revenue', round(metrics.revenue)],
        ['Target', round(metrics.target)],
        ['Worst case', round(forecast.scenarios.worst.value)],
        ['Base case', round(forecast.scenarios.base.value)],
        ['Best case', round(forecast.scenarios.best.value)],
        ['Forecast gap', round(forecast.gap)],
        [
          'Forecast attainment',
          forecast.attainment !== null ? round(forecast.attainment) : null,
        ],
        ['Probability of target', forecast.probability.score],
        ['Forecast confidence', forecast.confidence.score],
        ['Forecast at risk', round(forecast.risk.total)],
        ['Data quality', forecast.quality.score],
        [],
        ['Opportunity', 'Customer', 'Owner', 'Expected Close', 'Forecast Contribution'],
        ...forecast.contributions.map((entry) => [
          entry.opportunity.name,
          entry.opportunity.customerId,
          entry.opportunity.ownerId,
          isoDate(entry.opportunity.expectedCloseDate),
          round(entry.contribution),
        ]),
      ])
    }

    case 'insights':
      return toCsv([
        [
          'Severity',
          'Category',
          'Priority',
          'Title',
          'Detail',
          'Why It Matters',
          'Recommended Action',
          'Affected',
          'Impact',
          'Status',
          'Signal Date',
        ],
        ...document.insights.map((insight) => [
          insight.severity,
          CATEGORY_LABELS[insight.category],
          insight.priorityScore,
          insight.title,
          insight.description,
          insight.reason,
          insight.recommendation,
          insight.entityName ?? '',
          insight.impact !== null ? round(insight.impact) : null,
          insight.status,
          isoDate(insight.createdAt),
        ]),
      ])
  }
}
