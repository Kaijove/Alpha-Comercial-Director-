import { useMemo } from 'react'
import { Database } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { AnalyticsFilters } from './components/AnalyticsFilters'
import { AnalyticsHeader } from './components/AnalyticsHeader'
import { ConversionAnalysis } from './components/ConversionAnalysis'
import {
  AverageDealSizePanel,
  SalesCyclePanel,
} from './components/EfficiencyPanels'
import { PerformanceInsights } from './components/PerformanceInsights'
import { PerformanceKpis } from './components/PerformanceKpis'
import {
  GrowthPanel,
  PipelineCoveragePanel,
  RevenueVsTargetPanel,
} from './components/PerformancePanels'
import { RepPerformanceTable } from './components/RepPerformanceTable'
import { RevenueDistribution } from './components/RevenueDistribution'
import { RevenueTrend } from './components/RevenueTrend'
import { SalesFunnel } from './components/SalesFunnel'
import { TopCustomers } from './components/TopCustomers'
import { useAnalyticsData } from './useAnalyticsData'

/**
 * Analytics & Commercial Performance.
 *
 * Reading order: what happened (KPIs, trend), how it compares (target, growth,
 * coverage), why (funnel, conversion, cycle), who and where (reps, customers,
 * distribution), and finally what it means (insights).
 */
export function AnalyticsPage() {
  const {
    now,
    filters,
    setFilters,
    period,
    metrics,
    trend,
    insights,
    granularity,
    setGranularity,
    granularities,
    dataset,
  } = useAnalyticsData()

  const distributionContext = useMemo(
    () => ({ owners: dataset.owners, customers: dataset.customers }),
    [dataset.owners, dataset.customers],
  )

  const maxDate = now.toISOString().slice(0, 10)

  return (
    <div className="animate-rise space-y-7">
      <AnalyticsHeader metrics={metrics} />

      <AnalyticsFilters
        value={filters}
        onChange={setFilters}
        owners={dataset.owners}
        maxDate={maxDate}
      />

      {!metrics.hasData ? (
        <EmptyState
          icon={<Database className="size-4" />}
          title="No commercial data for this selection"
          description="No opportunities are assigned to the selected sales rep. Clear the filter to see the full picture."
        />
      ) : (
        <>
          <PerformanceKpis metrics={metrics} />

          <RevenueTrend
            data={trend}
            granularity={granularity}
            granularities={granularities}
            onGranularityChange={setGranularity}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <RevenueVsTargetPanel metrics={metrics} />
            <GrowthPanel metrics={metrics} />
            <PipelineCoveragePanel metrics={metrics} />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <SalesFunnel
                funnel={metrics.funnel}
                windowDays={period.days}
                averageCycleDays={metrics.salesCycle.average}
                wonInPeriod={metrics.wonCount}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <SalesCyclePanel
                current={metrics.salesCycle}
                previous={metrics.previousSalesCycle}
                deltaDays={metrics.salesCycleDelta}
              />
              <AverageDealSizePanel
                current={metrics.averageDealSize}
                previous={metrics.previousAverageDealSize}
                wonCount={metrics.wonCount}
                delta={metrics.averageDealSizeDelta}
              />
            </div>
          </div>

          <ConversionAnalysis conversions={metrics.conversions} />

          <PerformanceInsights insights={insights} />

          <RepPerformanceTable reps={metrics.reps} />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <TopCustomers customers={metrics.customers} now={now} />
            <RevenueDistribution
              opportunities={metrics.scoped}
              context={distributionContext}
              range={period}
            />
          </div>
        </>
      )}
    </div>
  )
}
