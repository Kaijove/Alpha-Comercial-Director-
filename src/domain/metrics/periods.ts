import {
  addDays,
  daysBetween,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
} from '@/lib/dates'
import type { SalesGoals } from '@/domain/workspace'

/**
 * Periods are calendar-anchored "to date" windows, never trailing windows.
 *
 * That is what makes target progress meaningful: a month-to-date window has a
 * real end date, a real number of days left and a real target to be measured
 * against. Trailing windows (last 30 days) are used only as a chart range.
 */
/**
 * `custom` exists for reports, which can be run over an arbitrary range. It is
 * deliberately absent from `PERIOD_OPTIONS`, so the dashboard, team and forecast
 * pickers keep offering only the three calendar-anchored windows.
 */
export type PeriodKey = 'mtd' | 'qtd' | 'ytd' | 'custom'

/** The three windows the in-app pickers offer. Reports may also be custom. */
export type CalendarPeriodKey = Exclude<PeriodKey, 'custom'>

export const PERIOD_OPTIONS: { value: CalendarPeriodKey; label: string; short: string }[] = [
  { value: 'mtd', label: 'This month', short: 'MTD' },
  { value: 'qtd', label: 'This quarter', short: 'QTD' },
  { value: 'ytd', label: 'This year', short: 'YTD' },
]

export interface PeriodRange {
  start: Date
  end: Date
}

export interface Period extends PeriodRange {
  key: PeriodKey
  label: string
  short: string
  /** "Now" as used by every calculation, so tests can pin it. */
  now: Date
  /** Days elapsed including today. */
  elapsedDays: number
  totalDays: number
  remainingDays: number
  /** 0..1 share of the period already spent. */
  elapsedFraction: number
  /** Equivalent window in the preceding month / quarter / year. */
  previous: PeriodRange
}

export function resolvePeriod(key: CalendarPeriodKey, now: Date = new Date()): Period {
  const today = startOfDay(now)

  const bounds: Record<CalendarPeriodKey, PeriodRange> = {
    mtd: { start: startOfMonth(today), end: endOfMonth(today) },
    qtd: { start: startOfQuarter(today), end: endOfQuarter(today) },
    ytd: { start: startOfYear(today), end: endOfYear(today) },
  }

  const { start, end } = bounds[key]
  const totalDays = daysBetween(start, end) + 1
  const elapsedDays = Math.min(totalDays, daysBetween(start, today) + 1)
  const remainingDays = Math.max(0, totalDays - elapsedDays)

  const previousStart =
    key === 'mtd'
      ? startOfMonth(today, -1)
      : key === 'qtd'
        ? startOfQuarter(addDays(startOfQuarter(today), -1))
        : startOfYear(today, -1)

  const previousBound =
    key === 'mtd'
      ? endOfMonth(previousStart)
      : key === 'qtd'
        ? endOfQuarter(previousStart)
        : endOfYear(previousStart)

  // Compare like with like: the same number of elapsed days, one period back.
  const previousEndCandidate = addDays(previousStart, elapsedDays - 1)
  const previousEnd =
    previousEndCandidate.getTime() > previousBound.getTime()
      ? previousBound
      : new Date(previousEndCandidate.setHours(23, 59, 59, 999))

  const option = PERIOD_OPTIONS.find((entry) => entry.value === key)!

  return {
    key,
    label: option.label,
    short: option.short,
    start,
    end,
    now,
    elapsedDays,
    totalDays,
    remainingDays,
    elapsedFraction: totalDays > 0 ? elapsedDays / totalDays : 0,
    previous: { start: previousStart, end: previousEnd },
  }
}

/**
 * The commitment for a whole period.
 *
 * Monthly and quarterly targets are derived from the monthly commitment; the
 * yearly one uses the annual target the director entered during onboarding, so
 * both numbers they configured are actually used.
 */
export function targetForPeriod(goals: SalesGoals, period: Period): number {
  switch (period.key) {
    case 'mtd':
      return goals.monthlyTarget
    case 'qtd':
      return goals.monthlyTarget * 3
    case 'ytd':
      return goals.annualTarget > 0 ? goals.annualTarget : goals.monthlyTarget * 12
    case 'custom':
      // No commitment exists for an arbitrary range, so the monthly one is
      // pro-rated by days. Stated in the report rather than presented as a
      // number the director actually signed up to.
      return (goals.monthlyTarget / AVERAGE_MONTH_DAYS) * period.totalDays
  }
}

/** Days in an average month, used only to pro-rate a custom range. */
export const AVERAGE_MONTH_DAYS = 30.44

/** How much of the period target should already be booked at this point. */
export function expectedToDate(target: number, period: Period): number {
  return target * period.elapsedFraction
}
