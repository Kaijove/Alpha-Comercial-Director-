import { useMemo } from 'react'
import { useWorkspace } from '@/app/providers/workspaceContext'
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from '@/lib/format'

/**
 * The single formatting surface for the UI.
 *
 * Components never build their own Intl formatters, so currency, locale and the
 * compact-number preference chosen during onboarding apply everywhere at once.
 */
export function useFormatters() {
  const { format } = useWorkspace()

  return useMemo(
    () => ({
      /** Respects the workspace "compact large figures" preference. */
      currency: (value: number) => formatCurrency(value, format),
      /** Always compact: for KPI tiles and chart axes. */
      compact: (value: number) => formatCurrency(value, format, { compact: true }),
      /** Always exact: for tooltips and detail views. */
      exact: (value: number) => formatCurrency(value, format, { compact: false }),
      signed: (value: number) =>
        formatCurrency(value, format, { signed: true, compact: Math.abs(value) >= 1_000_000 }),
      number: (value: number, decimals = 0) => formatNumber(value, format, decimals),
      percent: (value: number, decimals = 0) => formatPercent(value, format, decimals),
      /** Percentage-point delta, e.g. "+4.2 pp". */
      points: (value: number, decimals = 1) =>
        `${value >= 0 ? '+' : ''}${formatNumber(value * 100, format, decimals)} pp`,
      date: (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
        formatDate(value, format.locale, options),
      shortDate: (value: Date | string) =>
        formatDate(value, format.locale, { day: 'numeric', month: 'short' }),
      locale: format.locale,
      currencyCode: format.currency,
    }),
    [format],
  )
}

export type Formatters = ReturnType<typeof useFormatters>
