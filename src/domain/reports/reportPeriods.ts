import {
  addDays,
  daysBetween,
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from '@/lib/dates'
import { resolvePeriod, type Period } from '@/domain/metrics/periods'

/**
 * Report periods.
 *
 * Nothing here re-implements what a period is. A completed period is simply the
 * existing calendar resolver run with `now` moved to the last day of that
 * period - which means a report over last month gets the monthly target, a
 * report over last quarter gets the quarterly one, and the mismatch the brief
 * warns about (monthly revenue measured against a yearly target) cannot happen
 * by construction.
 *
 * Moving `now` also does the right thing everywhere downstream: for a closed
 * period, "today" is the day the period ended, so stalled counts, deal health
 * and days-remaining are all measured at the close rather than from this
 * morning.
 */
export type ReportPeriodKey =
  | 'this-month'
  | 'last-month'
  | 'this-quarter'
  | 'last-quarter'
  | 'this-year'
  | 'last-year'
  | 'custom'

export const REPORT_PERIOD_OPTIONS: { value: ReportPeriodKey; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'last-quarter', label: 'Last quarter' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
]

export interface CustomRange {
  /** `YYYY-MM-DD`, as the date inputs produce them. */
  from: string
  to: string
}

/** A report period carries whether the window has already finished. */
export interface ReportPeriod extends Period {
  reportKey: ReportPeriodKey
  /** Human name for the window, e.g. "September 2026" or "Q3 2026". */
  title: string
  /** True once the window has ended: the figures are final, not a projection. */
  isComplete: boolean
}

/** The last instant of the period before the one containing `date`. */
function endOfPrevious(date: Date, unit: 'month' | 'quarter' | 'year'): Date {
  const start =
    unit === 'month'
      ? startOfMonth(date)
      : unit === 'quarter'
        ? startOfQuarter(date)
        : startOfYear(date)
  return addDays(start, -1)
}

export function resolveReportPeriod(
  key: ReportPeriodKey,
  now: Date = new Date(),
  custom?: CustomRange,
): ReportPeriod {
  const today = startOfDay(now)

  if (key === 'custom') {
    return buildCustomPeriod(custom, now)
  }

  // A completed window is the same resolver, anchored on that window's own
  // last day rather than on today.
  const anchors: Record<Exclude<ReportPeriodKey, 'custom'>, { at: Date; base: 'mtd' | 'qtd' | 'ytd' }> = {
    'this-month': { at: today, base: 'mtd' },
    'last-month': { at: endOfPrevious(today, 'month'), base: 'mtd' },
    'this-quarter': { at: today, base: 'qtd' },
    'last-quarter': { at: endOfPrevious(today, 'quarter'), base: 'qtd' },
    'this-year': { at: today, base: 'ytd' },
    'last-year': { at: endOfPrevious(today, 'year'), base: 'ytd' },
  }

  const anchor = anchors[key]
  const period = resolvePeriod(anchor.base, anchor.at)

  return {
    ...period,
    reportKey: key,
    title: periodTitle(period),
    isComplete: period.end.getTime() < today.getTime(),
  }
}

function buildCustomPeriod(custom: CustomRange | undefined, now: Date): ReportPeriod {
  const today = startOfDay(now)

  // An absent or reversed range falls back to the current month rather than
  // producing a window that runs backwards.
  const parsed = parseRange(custom)
  const start = parsed?.start ?? startOfMonth(today)
  const end = parsed?.end ?? endOfMonth(today)

  const totalDays = Math.max(1, daysBetween(start, end) + 1)
  const reference = end.getTime() < today.getTime() ? end : today
  const elapsedDays = Math.max(
    1,
    Math.min(totalDays, daysBetween(start, startOfDay(reference)) + 1),
  )

  // The comparison window is the same number of days immediately before it, so
  // growth against "the previous period" is a like-for-like comparison.
  const previousEndDay = addDays(start, -1)
  const previousStart = addDays(previousEndDay, -(totalDays - 1))
  const previousEnd = endOfDay(previousEndDay)

  return {
    key: 'custom',
    reportKey: 'custom',
    label: 'Custom range',
    short: 'Custom',
    title: formatRangeTitle(start, end),
    start,
    end,
    now: reference,
    elapsedDays,
    totalDays,
    remainingDays: Math.max(0, totalDays - elapsedDays),
    elapsedFraction: totalDays > 0 ? elapsedDays / totalDays : 0,
    previous: { start: previousStart, end: previousEnd },
    isComplete: end.getTime() < today.getTime(),
  }
}

function parseRange(custom?: CustomRange): { start: Date; end: Date } | null {
  if (!custom?.from || !custom?.to) return null

  const start = startOfDay(new Date(`${custom.from}T00:00:00`))
  const end = new Date(`${custom.to}T23:59:59.999`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end.getTime() < start.getTime()) return null

  return { start, end }
}

/** Whether a custom range can actually be used, and why not if it cannot. */
export function validateCustomRange(custom?: CustomRange): string | null {
  if (!custom?.from || !custom?.to) return 'Choose a start and an end date.'
  const parsed = parseRange(custom)
  if (!parsed) return 'The end date must fall on or after the start date.'
  return null
}

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * The name a period goes by on a document: "September 2026", "Q3 2026", "2026".
 *
 * Deliberately not locale-formatted through Intl: a report title is a heading,
 * not a data point, and it has to read the same in the filename it generates.
 */
export function periodTitle(period: Period): string {
  switch (period.key) {
    case 'ytd':
      return String(period.start.getFullYear())
    case 'qtd':
      return `Q${Math.floor(period.start.getMonth() / 3) + 1} ${period.start.getFullYear()}`
    case 'mtd':
      return `${MONTHS_LONG[period.start.getMonth()]} ${period.start.getFullYear()}`
    case 'custom':
      return formatRangeTitle(period.start, period.end)
  }
}

function formatRangeTitle(start: Date, end: Date): string {
  const day = (date: Date) =>
    `${date.getDate()} ${MONTHS_LONG[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`
  return `${day(start)} – ${day(end)}`
}

/** Short form used in filenames: `2026-09`, `2026-Q3`, `2026`, `2026-09-01_2026-09-30`. */
export function periodFileToken(period: Period): string {
  const pad = (value: number) => `${value}`.padStart(2, '0')
  switch (period.key) {
    case 'ytd':
      return String(period.start.getFullYear())
    case 'qtd':
      return `${period.start.getFullYear()}-Q${Math.floor(period.start.getMonth() / 3) + 1}`
    case 'mtd':
      return `${period.start.getFullYear()}-${pad(period.start.getMonth() + 1)}`
    case 'custom': {
      const key = (date: Date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      return `${key(period.start)}_${key(period.end)}`
    }
  }
}
