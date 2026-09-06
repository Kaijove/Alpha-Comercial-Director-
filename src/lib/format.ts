import type { Preferences } from '@/domain/workspace'

export interface FormatContext {
  locale: string
  currency: string
  compactNumbers: boolean
}

export interface CurrencyFormatOptions {
  /** Force compact/expanded notation, overriding the workspace preference. */
  compact?: boolean
  decimals?: number
  /** Render "+" in front of positive values (useful for deltas). */
  signed?: boolean
}

function safeFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
  value: number,
  fallback: string,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch {
    return fallback
  }
}

export function formatCurrency(
  value: number,
  ctx: FormatContext,
  options: CurrencyFormatOptions = {},
): string {
  const amount = Number.isFinite(value) ? value : 0
  const compact = options.compact ?? (ctx.compactNumbers && Math.abs(amount) >= 1_000_000)
  const decimals = options.decimals ?? (compact ? 1 : 0)

  const formatted = safeFormat(
    ctx.locale,
    {
      style: 'currency',
      currency: ctx.currency || 'EUR',
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    },
    amount,
    `${amount}`,
  )

  return options.signed && amount > 0 ? `+${formatted}` : formatted
}

/**
 * A figure that cannot be rendered is shown as an em dash, never as "NaN".
 *
 * `formatCurrency` has always coerced a non-finite value to zero; these two did
 * not, so a NaN arriving from anywhere upstream printed the word "NaN" straight
 * onto a KPI tile. An em dash says "not available", which is both true and the
 * same thing the tables already show for a missing figure.
 */
const NOT_AVAILABLE = '—'

export function formatNumber(value: number, ctx: FormatContext, decimals = 0): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE
  return safeFormat(
    ctx.locale,
    { minimumFractionDigits: 0, maximumFractionDigits: decimals },
    value,
    `${value}`,
  )
}

export function formatPercent(value: number, ctx: FormatContext, decimals = 0): string {
  if (!Number.isFinite(value)) return NOT_AVAILABLE
  return safeFormat(
    ctx.locale,
    { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: decimals },
    value,
    `${Math.round(value * 100)}%`,
  )
}

export function formatDate(
  date: Date | string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  const value = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(value.getTime())) return '—'
  try {
    return new Intl.DateTimeFormat(locale, options).format(value)
  } catch {
    return value.toDateString()
  }
}

/** Currency symbol for inline input adornments. */
export function currencySymbol(locale: string, currency: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/** Locale-aware thousands grouping for the raw value shown inside an input. */
export function formatAmountInput(value: number | '', locale: string): string {
  if (value === '' || !Number.isFinite(Number(value))) return ''
  return safeFormat(locale, { maximumFractionDigits: 0 }, Number(value), `${value}`)
}

/** Accepts "1.250.000", "1,250,000", "1250000" and returns 1250000. */
export function parseAmountInput(raw: string): number | '' {
  const cleaned = raw.replace(/[^\d]/g, '')
  if (cleaned.length === 0) return ''
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isFinite(parsed) ? parsed : ''
}

export function timeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 6) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 19) return 'Good afternoon'
  return 'Good evening'
}

export function formatContextFrom(
  preferences: Preferences,
  currency: string,
): FormatContext {
  return {
    locale: preferences.locale,
    currency,
    compactNumbers: preferences.compactNumbers,
  }
}

export const MONTHS = [
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
