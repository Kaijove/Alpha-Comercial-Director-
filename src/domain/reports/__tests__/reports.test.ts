import { describe, expect, it } from 'vitest'
import { generateCommercialData } from '@/data/seed/generateCommercialData'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod, targetForPeriod } from '@/domain/metrics/periods'
import { buildReport } from '../reportEngine'
import { buildCsv, toCsv } from '../csvExport'
import { buildFileName, sanitiseSegment } from '../reportNaming'
import { isBlocked, validateReport } from '../reportValidation'
import {
  periodFileToken,
  periodTitle,
  resolveReportPeriod,
  validateCustomRange,
} from '../reportPeriods'
import { REPORT_TYPES, type ReportConfig } from '../types'
import { NOW, makeWorkspace, testFormatters } from '@/domain/intelligence/__tests__/factories'

/**
 * A report is only worth anything if the numbers in it are the numbers on the
 * screen. These tests are mostly about that: same call, same figures, no second
 * definition of revenue anywhere in the reporting layer.
 */
const workspace = makeWorkspace()
const dataset = generateCommercialData(workspace, NOW)

const activityIndex = new Map<string, typeof dataset.activities>()
for (const activity of dataset.activities) {
  const list = activityIndex.get(activity.opportunityId)
  if (list) list.push(activity)
  else activityIndex.set(activity.opportunityId, [activity])
}

const config = (overrides: Partial<ReportConfig> = {}): ReportConfig => ({
  type: 'executive',
  period: 'this-month',
  sections: [...REPORT_TYPES[0].sections],
  ownerId: null,
  ...overrides,
})

const build = (overrides: Partial<ReportConfig> = {}) =>
  buildReport({
    config: config(overrides),
    dataset,
    workspace,
    now: NOW,
    fmt: testFormatters,
    statuses: {},
    activitiesFor: (id) => activityIndex.get(id) ?? [],
    customerName: (id) => dataset.customers.find((c) => c.id === id)?.name ?? 'Unknown',
    ownerName: (id) => dataset.owners.find((o) => o.id === id)?.name ?? 'Unassigned',
  })

describe('report periods', () => {
  it('gives a completed month the monthly target, not the yearly one', () => {
    const period = resolveReportPeriod('last-month', NOW)
    expect(period.key).toBe('mtd')
    expect(period.isComplete).toBe(true)
    expect(targetForPeriod(workspace.goals, period)).toBe(workspace.goals.monthlyTarget)
  })

  it('gives a quarter three months of commitment and a year the annual one', () => {
    expect(targetForPeriod(workspace.goals, resolveReportPeriod('this-quarter', NOW))).toBe(
      workspace.goals.monthlyTarget * 3,
    )
    expect(targetForPeriod(workspace.goals, resolveReportPeriod('this-year', NOW))).toBe(
      workspace.goals.annualTarget,
    )
  })

  it('anchors a completed period on its own last day, not on today', () => {
    const period = resolveReportPeriod('last-month', NOW)
    expect(period.end.getTime()).toBeLessThan(NOW.getTime())
    expect(period.now.getTime()).toBeLessThanOrEqual(period.end.getTime() + 86_400_000)
    expect(period.remainingDays).toBe(0)
  })

  it('marks the current period as still running', () => {
    const period = resolveReportPeriod('this-month', NOW)
    expect(period.isComplete).toBe(false)
    expect(period.remainingDays).toBeGreaterThan(0)
  })

  it('pro-rates the target across a custom range instead of inventing one', () => {
    const period = resolveReportPeriod('custom', NOW, { from: '2026-06-01', to: '2026-06-30' })
    expect(period.key).toBe('custom')
    expect(period.totalDays).toBe(30)
    const target = targetForPeriod(workspace.goals, period)
    expect(target).toBeCloseTo((workspace.goals.monthlyTarget / 30.44) * 30, 4)
  })

  it('compares a custom range against the same number of days before it', () => {
    const period = resolveReportPeriod('custom', NOW, { from: '2026-06-11', to: '2026-06-20' })
    expect(period.totalDays).toBe(10)
    // The window ends at 23:59:59.999, so ceil counts the final partial day.
    const previousDays = Math.ceil(
      (period.previous.end.getTime() - period.previous.start.getTime()) / 86_400_000,
    )
    expect(previousDays).toBe(10)
    expect(period.previous.end.getTime()).toBeLessThan(period.start.getTime())
  })

  it('refuses a range that runs backwards or is incomplete', () => {
    expect(validateCustomRange(undefined)).not.toBeNull()
    expect(validateCustomRange({ from: '2026-06-01', to: '' })).not.toBeNull()
    expect(validateCustomRange({ from: '2026-06-30', to: '2026-06-01' })).not.toBeNull()
    expect(validateCustomRange({ from: '2026-06-01', to: '2026-06-30' })).toBeNull()
  })

  it('names and tokenises periods for headings and filenames', () => {
    expect(periodTitle(resolvePeriod('mtd', NOW))).toBe('June 2026')
    expect(periodTitle(resolvePeriod('qtd', NOW))).toBe('Q2 2026')
    expect(periodTitle(resolvePeriod('ytd', NOW))).toBe('2026')
    expect(periodFileToken(resolvePeriod('mtd', NOW))).toBe('2026-06')
    expect(periodFileToken(resolvePeriod('qtd', NOW))).toBe('2026-Q2')
  })
})

describe('report consistency', () => {
  const report = build()

  it('reports the figures the shared metrics layer produced, unchanged', () => {
    const period = resolveReportPeriod('this-month', NOW)
    const metrics = computeCommercialMetrics(dataset, workspace, period, null)

    expect(report.metrics.revenue).toBe(metrics.revenue)
    expect(report.metrics.target).toBe(metrics.target)
    expect(report.metrics.pipelineTotal).toBe(metrics.pipelineTotal)
    expect(report.metrics.weightedPipeline).toBe(metrics.weightedPipeline)
    expect(report.metrics.winRate).toBe(metrics.winRate)
    expect(report.forecast.value).toBe(metrics.forecast.value)
    expect(report.forecast.gap).toBe(metrics.forecast.gap)
  })

  it('is deterministic: the same configuration produces the same document', () => {
    const again = build()
    expect(again.summary).toEqual(report.summary)
    expect(again.kpis.map((kpi) => kpi.value)).toEqual(report.kpis.map((kpi) => kpi.value))
    expect(again.metrics.revenue).toBe(report.metrics.revenue)
    expect(again.forecast.value).toBe(report.forecast.value)
  })

  it('scopes to one representative without changing the definitions', () => {
    const owner = dataset.owners[0]
    const scoped = build({ ownerId: owner.id })
    expect(scoped.meta.ownerName).toBe(owner.name)
    expect(scoped.metrics.revenue).toBeLessThanOrEqual(report.metrics.revenue)
  })
})

describe('executive summary', () => {
  it('is generated, not empty, and mentions the actual figures', () => {
    const report = build()
    expect(report.summary.length).toBeGreaterThan(0)
    for (const paragraph of report.summary) {
      expect(paragraph.trim().length).toBeGreaterThan(0)
      expect(paragraph).not.toContain('undefined')
      expect(paragraph).not.toContain('NaN')
    }
    expect(report.summary.join(' ')).toContain(testFormatters.currency(report.metrics.revenue))
  })

  it('speaks in the past tense once the period has closed', () => {
    const closed = build({ period: 'last-month' })
    expect(closed.summary[0]).toContain('closed at')
    expect(closed.summary.join(' ')).toContain('has closed')
  })

  it('speaks about a forecast while the period is still running', () => {
    const running = build({ period: 'this-month' })
    expect(running.summary.join(' ')).toContain('base forecast')
  })
})

describe('report sections and gaps', () => {
  it('only includes sections the configuration asked for', () => {
    const report = build({ sections: ['summary', 'kpis'] })
    expect(report.sections).toEqual(['summary', 'kpis'])
  })

  it('drops a section the data cannot support and says why', () => {
    const report = build({ period: 'last-month', sections: ['summary', 'forecast'] })
    expect(report.sections).not.toContain('forecast')
    expect(report.gaps.some((gap) => gap.section === 'forecast')).toBe(true)
    expect(report.gaps[0].message.length).toBeGreaterThan(0)
  })

  it('orders sections the document way, whatever order they were enabled', () => {
    const report = build({ sections: ['highlights', 'kpis', 'summary'] })
    expect(report.sections).toEqual(['summary', 'kpis', 'highlights'])
  })

  it('gives each report type its own set of sections', () => {
    for (const type of REPORT_TYPES) {
      expect(type.sections.length).toBeGreaterThan(0)
      expect(type.sections).toContain('summary')
    }
  })
})

describe('KPIs', () => {
  it('never renders undefined, and formats every figure', () => {
    const report = build()
    for (const kpi of report.kpis) {
      expect(kpi.value).not.toContain('undefined')
      expect(kpi.value).not.toContain('NaN')
      expect(kpi.label.length).toBeGreaterThan(0)
    }
  })

  it('shows a result rather than a forecast once the period has closed', () => {
    const closed = build({ period: 'last-month' })
    expect(closed.kpis.some((kpi) => kpi.key === 'result')).toBe(true)
    expect(closed.kpis.some((kpi) => kpi.key === 'forecast')).toBe(false)
  })

  it('shows a forecast while the period is running', () => {
    const running = build({ period: 'this-month' })
    expect(running.kpis.some((kpi) => kpi.key === 'forecast')).toBe(true)
  })
})

describe('management highlights', () => {
  it('takes its actions from the intelligence engine, without repeating one', () => {
    const report = build()
    const texts = report.highlights.actions.map((action) => action.text)
    expect(new Set(texts).size).toBe(texts.length)
    for (const action of report.highlights.actions) {
      expect(action.text.trim().length).toBeGreaterThan(0)
    }
  })

  it('caps each list so a document stays readable', () => {
    const report = build()
    expect(report.highlights.positive.length).toBeLessThanOrEqual(5)
    expect(report.highlights.attention.length).toBeLessThanOrEqual(5)
    expect(report.highlights.actions.length).toBeLessThanOrEqual(5)
  })
})

describe('revenue series', () => {
  it('accumulates to the period revenue', () => {
    const report = build()
    const last = report.revenueSeries[report.revenueSeries.length - 1]
    expect(last.cumulative).toBeCloseTo(report.metrics.revenue, 4)
  })

  it('accumulates to the period target', () => {
    const report = build()
    const last = report.revenueSeries[report.revenueSeries.length - 1]
    expect(last.target).toBeCloseTo(report.metrics.target, 4)
  })
})

describe('CSV export', () => {
  const report = build()
  const names = {
    customer: (id: string) => dataset.customers.find((c) => c.id === id)?.name ?? 'Unknown',
    owner: (id: string) => dataset.owners.find((o) => o.id === id)?.name ?? 'Unassigned',
  }

  it('quotes a field containing a separator and doubles an embedded quote', () => {
    const csv = toCsv([['plain', 'has,comma', 'has"quote', 'has\nnewline']])
    expect(csv).toContain('"has,comma"')
    expect(csv).toContain('"has""quote"')
    expect(csv).toContain('"has\nnewline"')
  })

  it('neutralises a field a spreadsheet would treat as a formula', () => {
    const csv = toCsv([['=SUM(A1:A2)', '+1', '-1', '@cmd']])
    expect(csv).toContain("'=SUM(A1:A2)")
    expect(csv).toContain("'+1")
    expect(csv).toContain("'@cmd")
  })

  it('writes a header row and one row per opportunity', () => {
    const csv = buildCsv('opportunities', report, names)
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toContain('Opportunity,Customer,Owner,Stage,Value')
    expect(lines.length - 1).toBe(report.forecast.contributions.length)
  })

  it('writes one row per representative', () => {
    const csv = buildCsv('team', report, names)
    expect(csv.trim().split('\r\n').length - 1).toBe(report.reps.length)
  })

  it('writes one row per insight', () => {
    const csv = buildCsv('insights', report, names)
    expect(csv.trim().split('\r\n').length - 1).toBe(report.insights.length)
  })

  it('produces a non-empty file for every dataset', () => {
    for (const dataset of ['opportunities', 'pipeline', 'team', 'revenue', 'forecast', 'insights'] as const) {
      const csv = buildCsv(dataset, report, names)
      expect(csv.length).toBeGreaterThan(20)
      expect(csv).not.toContain('undefined')
    }
  })
})

describe('file names', () => {
  it('follows the company_report_period convention', () => {
    const report = build()
    expect(
      buildFileName({
        company: report.meta.companyName,
        reportTitle: report.typeLabel,
        period: report.period,
        extension: 'pdf',
      }),
    ).toBe('TERMOCLIMA-INDUSTRIAL_Executive-Commercial-Report_2026-06.pdf')
  })

  it('strips characters a filesystem would reject', () => {
    expect(sanitiseSegment('ACME / Industrial: "North" <2026>')).toBe('ACME-Industrial-North-2026')
    expect(sanitiseSegment('a\\b|c?d*e')).toBe('abcde')
    expect(sanitiseSegment('trailing dots...')).toBe('trailing-dots')
  })

  it('folds accents rather than dropping the letters', () => {
    expect(sanitiseSegment('Núñez Aeronáutica')).toBe('Nunez-Aeronautica')
  })

  it('never returns an empty or reserved name', () => {
    expect(sanitiseSegment('///')).toBe('Report')
    expect(sanitiseSegment('CON')).toBe('CON-report')
    expect(sanitiseSegment('   ')).toBe('Report')
  })
})

describe('export validation', () => {
  it('lets a complete configuration through', () => {
    const report = build()
    const issues = validateReport(config(), workspace, report)
    expect(isBlocked(issues)).toBe(false)
  })

  it('blocks an export with no workspace', () => {
    expect(isBlocked(validateReport(config(), null, null))).toBe(true)
  })

  it('blocks an export with every section switched off', () => {
    const issues = validateReport(config({ sections: [] }), workspace, null)
    expect(isBlocked(issues)).toBe(true)
  })

  it('blocks an incomplete custom range', () => {
    const issues = validateReport(
      config({ period: 'custom', custom: { from: '2026-06-10', to: '' } }),
      workspace,
      null,
    )
    expect(isBlocked(issues)).toBe(true)
  })

  it('blocks a company with no currency', () => {
    const broken = { ...workspace, company: { ...workspace.company, currency: '' } }
    expect(isBlocked(validateReport(config(), broken, null))).toBe(true)
  })

  it('warns without blocking when a section had to be dropped', () => {
    const report = build({ period: 'last-month' })
    const issues = validateReport(config({ period: 'last-month' }), workspace, report)
    expect(isBlocked(issues)).toBe(false)
    expect(issues.some((issue) => issue.level === 'warning')).toBe(true)
  })
})
