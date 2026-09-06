import type { Workspace } from '@/domain/workspace'
import { validateCustomRange } from './reportPeriods'
import type { ReportConfig, ReportDocument } from './types'

/**
 * What has to be true before a document is worth generating.
 *
 * A broken PDF is worse than a refused one: it reaches a CEO with a blank page
 * or a currency symbol missing and the whole report loses its credibility. So
 * the checks run before export, and each one says what to do about it rather
 * than only that something is wrong.
 */
export interface ValidationIssue {
  /** `blocking` stops the export; `warning` is shown but lets it proceed. */
  level: 'blocking' | 'warning'
  message: string
}

export function validateReport(
  config: ReportConfig,
  workspace: Workspace | null,
  document: ReportDocument | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!workspace) {
    issues.push({
      level: 'blocking',
      message: 'No workspace is configured. Complete onboarding before generating a report.',
    })
    return issues
  }

  if (!workspace.company.name.trim()) {
    issues.push({
      level: 'blocking',
      message: 'The company name is empty. Set it in Settings → Company before exporting.',
    })
  }

  if (!workspace.company.currency) {
    issues.push({
      level: 'blocking',
      message: 'No reporting currency is set. Choose one in Settings → Goals & currency.',
    })
  }

  if (config.period === 'custom') {
    const rangeError = validateCustomRange(config.custom)
    if (rangeError) issues.push({ level: 'blocking', message: rangeError })
  }

  if (config.sections.length === 0) {
    issues.push({
      level: 'blocking',
      message: 'Every section is switched off. Enable at least one before exporting.',
    })
  }

  if (document) {
    if (document.sections.length === 0) {
      issues.push({
        level: 'blocking',
        message:
          'None of the selected sections can be built from the data in this period. Choose a different period or enable more sections.',
      })
    }

    if (document.metrics.target <= 0) {
      issues.push({
        level: 'warning',
        message:
          'No target is set for this period, so attainment and the forecast gap are omitted. Set one in Settings → Goals & currency.',
      })
    }

    if (document.metrics.revenue === 0 && document.metrics.openCount === 0) {
      issues.push({
        level: 'warning',
        message: 'This period contains no won revenue and no open opportunities.',
      })
    }

    for (const gap of document.gaps) {
      issues.push({ level: 'warning', message: gap.message })
    }
  }

  return issues
}

export const isBlocked = (issues: ValidationIssue[]): boolean =>
  issues.some((issue) => issue.level === 'blocking')
