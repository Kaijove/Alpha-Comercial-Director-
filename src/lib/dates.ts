/** Small date helpers. All local-time, all pure, no dependencies. */

export const DAY_MS = 86_400_000

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date)
  copy.setMonth(copy.getMonth() + months, 1)
  return copy
}

export function startOfMonth(date: Date, monthOffset = 0): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + monthOffset, 1))
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3)
  return startOfDay(new Date(date.getFullYear(), quarter * 3, 1))
}

export function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3)
  return endOfDay(new Date(date.getFullYear(), quarter * 3 + 3, 0))
}

export function startOfYear(date: Date, yearOffset = 0): Date {
  return startOfDay(new Date(date.getFullYear() + yearOffset, 0, 1))
}

export function endOfYear(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), 11, 31))
}

/** Start of the calendar week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: 'monday' | 'sunday' = 'monday'): Date {
  const copy = startOfDay(date)
  const day = copy.getDay()
  const offset = weekStartsOn === 'monday' ? (day + 6) % 7 : day
  copy.setDate(copy.getDate() - offset)
  return copy
}

export function endOfWeek(date: Date, weekStartsOn: 'monday' | 'sunday' = 'monday'): Date {
  return endOfDay(addDays(startOfWeek(date, weekStartsOn), 6))
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

/**
 * Inclusive on both ends.
 *
 * `Date.parse` rather than `new Date`: this runs tens of thousands of times per
 * render across the metrics layer - once per opportunity per owner per range -
 * and allocating a Date object each time was measurably the most expensive
 * thing the derivation did.
 */
export function isWithin(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return false
  return time >= start.getTime() && time <= end.getTime()
}

/** Count of working days (Mon-Fri) between two dates, inclusive. */
export function workingDaysBetween(from: Date, to: Date): number {
  let count = 0
  const cursor = startOfDay(from)
  const limit = startOfDay(to)
  while (cursor.getTime() <= limit.getTime()) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

export const toIso = (date: Date): string => date.toISOString()

/**
 * Calendar day as the user sees it, `YYYY-MM-DD`.
 *
 * Not `toISOString().slice(0, 10)`: that converts to UTC first, so the first of
 * a month in any timezone ahead of UTC comes back as the last day of the one
 * before. Anything that keys or labels by a calendar day has to use this.
 */
export function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
