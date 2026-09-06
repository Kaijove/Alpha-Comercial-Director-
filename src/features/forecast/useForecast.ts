import { useCallback, useEffect, useMemo, useState } from 'react'
import { toDateKey } from '@/lib/dates'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { localForecastSnapshotRepository } from '@/data/repository/forecastSnapshotRepository'
import { computeCommercialMetrics } from '@/domain/metrics/dashboardMetrics'
import { resolvePeriod, type CalendarPeriodKey } from '@/domain/metrics/periods'
import { assessAccuracy, snapshotId } from '@/domain/forecast/forecastAccuracy'
import { simulate } from '@/domain/forecast/forecastSensitivity'
import {
  DEFAULT_SIMULATOR,
  type ForecastSnapshot,
  type ScenarioKey,
  type SimulatorInputs,
} from '@/domain/forecast/types'

/**
 * One derivation pass for the whole Forecast page.
 *
 * The forecast itself is not computed here: it arrives on `metrics.forecast`
 * from the shared metrics layer, exactly as the Dashboard receives it. This
 * hook only chooses the period, holds the scenario the director is looking at,
 * runs the simulator, and owns the snapshot list.
 *
 * The simulator is derived on every render from unchanged opportunities and
 * written nowhere, so nothing a director explores here can leak into the real
 * commercial data.
 */
export function useForecast() {
  const workspace = useReadyWorkspace()
  const { dataset } = useCommercialData()

  const [periodKey, setPeriodKey] = useState<CalendarPeriodKey>('mtd')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [scenario, setScenario] = useState<ScenarioKey>('base')
  const [simulator, setSimulator] = useState<SimulatorInputs>(DEFAULT_SIMULATOR)

  // Pinned per mount: the forecast must not shift under the director mid-read.
  const now = useMemo(() => new Date(), [])
  const period = useMemo(() => resolvePeriod(periodKey, now), [periodKey, now])

  const metrics = useMemo(
    () => computeCommercialMetrics(dataset, workspace, period, ownerId),
    [dataset, workspace, period, ownerId],
  )

  const forecast = metrics.forecast

  const simulation = useMemo(
    () =>
      simulate(
        forecast.contributions,
        forecast.closedRevenue,
        metrics.target,
        forecast.probability.score,
        simulator,
      ),
    [forecast, metrics.target, simulator],
  )

  const resetSimulator = useCallback(() => setSimulator(DEFAULT_SIMULATOR), [])

  // --- Snapshots -----------------------------------------------------------
  const [snapshots, setSnapshots] = useState<ForecastSnapshot[]>(() =>
    localForecastSnapshotRepository.load(),
  )

  useEffect(() => {
    localForecastSnapshotRepository.save(snapshots)
  }, [snapshots])

  const periodId = `${period.key}:${toDateKey(period.start)}`

  const saveSnapshot = useCallback(() => {
    const createdAt = new Date().toISOString()
    const entry: ForecastSnapshot = {
      id: snapshotId(periodId, createdAt),
      period: periodId,
      periodLabel: period.label,
      createdAt,
      target: metrics.target,
      forecastValue: forecast.scenarios[scenario].value,
      scenario,
      confidence: forecast.confidence.score,
      probability: forecast.probability.score,
      actualValue: null,
    }
    // Same period, same day, same id: taking a snapshot twice in an afternoon
    // updates the record rather than filling the list with near-duplicates.
    setSnapshots((current) => [...current.filter((s) => s.id !== entry.id), entry])
  }, [forecast, metrics.target, period.label, periodId, scenario])

  const clearSnapshots = useCallback(() => setSnapshots([]), [])

  const accuracy = useMemo(() => assessAccuracy(snapshots), [snapshots])

  const periodSnapshots = useMemo(
    () =>
      snapshots
        .filter((snapshot) => snapshot.period === periodId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [snapshots, periodId],
  )

  return {
    now,
    period,
    periodKey,
    setPeriodKey,
    ownerId,
    setOwnerId,
    metrics,
    forecast,
    scenario,
    setScenario,
    simulator,
    setSimulator,
    resetSimulator,
    simulation,
    owners: dataset.owners,
    snapshots,
    periodSnapshots,
    saveSnapshot,
    clearSnapshots,
    accuracy,
  }
}

export type ForecastViewModel = ReturnType<typeof useForecast>
