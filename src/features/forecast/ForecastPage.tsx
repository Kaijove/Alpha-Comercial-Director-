import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Opportunity } from '@/domain/commerce'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { PERIOD_OPTIONS } from '@/domain/metrics/periods'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DealDetailPanel } from '@/features/pipeline/components/DealDetailPanel'
import { useFormatters } from '@/hooks/useFormatters'
import { useForecast } from './useForecast'
import { ContributionTable } from './components/ContributionTable'
import { DataQualityPanel } from './components/DataQualityPanel'
import { ForecastChart } from './components/ForecastChart'
import { ForecastExplanation } from './components/ForecastExplanation'
import { ForecastOverview } from './components/ForecastOverview'
import { ForecastRiskPanel } from './components/ForecastRiskPanel'
import { ForecastTimelinePanel } from './components/ForecastTimelinePanel'
import { ForecastWaterfall } from './components/ForecastWaterfall'
import { PathToTargetPanel } from './components/PathToTargetPanel'
import { RepForecastTable } from './components/RepForecastTable'
import { ScenarioPanel } from './components/ScenarioPanel'
import { ScenarioSimulator } from './components/ScenarioSimulator'
import { SensitivityPanel } from './components/SensitivityPanel'
import { SnapshotsPanel } from './components/SnapshotsPanel'
import { StateBadge } from './components/ForecastVisuals'

/**
 * Advanced Commercial Forecast.
 *
 * One question, answered from the top down: where is this period going, how
 * sure are we, and what would have to happen to change it.
 *
 * Every figure on the page comes from the single forecast report on
 * `metrics.forecast` - the same report the Dashboard KPI and the Intelligence
 * rules read. No component computes a projection of its own.
 */
export function ForecastPage() {
  const navigate = useNavigate()
  const fmt = useFormatters()
  const {
    metrics,
    forecast,
    period,
    periodKey,
    setPeriodKey,
    ownerId,
    setOwnerId,
    owners,
    scenario,
    setScenario,
    simulator,
    setSimulator,
    resetSimulator,
    simulation,
    periodSnapshots,
    saveSnapshot,
    clearSnapshots,
    accuracy,
    now,
  } = useForecast()

  const { dataset, customerById, ownerById, moveOpportunity, deleteOpportunity } =
    useCommercialData()
  const [selected, setSelected] = useState<Opportunity | null>(null)

  const selectedScenario = forecast.scenarios[scenario]

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-page font-semibold text-ink">
              Commercial Forecast
            </h1>
            <StateBadge state={forecast.gapDetail.state} />
          </div>
          <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
            Where {period.label.toLowerCase()} is going, and what would have to happen to
            change it. Every figure is calculated from your own commercial data by a fixed
            model — nothing is predicted by a model that learned it elsewhere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={periodKey}
            onChange={setPeriodKey}
            options={PERIOD_OPTIONS}
          />
          <Select
            aria-label="Filter by representative"
            value={ownerId ?? ''}
            onChange={(event) => setOwnerId(event.target.value || null)}
            options={[
              { value: '', label: 'Whole team' },
              ...owners.map((owner) => ({ value: owner.id, label: owner.name })),
            ]}
          />
        </div>
      </header>

      <ForecastOverview metrics={metrics} />

      <ForecastChart opportunities={dataset.opportunities} metrics={metrics} />

      <ScenarioPanel
        forecast={forecast}
        target={metrics.target}
        selected={scenario}
        onSelect={setScenario}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ForecastWaterfall steps={forecast.waterfall} target={metrics.target} />
        <PathToTargetPanel
          metrics={metrics}
          onSelect={(entry) => setSelected(entry.opportunity)}
        />
      </div>

      <ForecastExplanation forecast={forecast} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ForecastTimelinePanel timeline={forecast.timeline} />
        <DataQualityPanel quality={forecast.quality} />
      </div>

      <ForecastRiskPanel
        risk={forecast.risk}
        onSelect={(entry) => setSelected(entry.opportunity)}
      />

      <RepForecastTable reps={forecast.reps} />

      <ContributionTable
        forecast={forecast}
        customerName={(id) => customerById(id)?.name ?? 'Unknown account'}
        ownerName={(id) => ownerById(id)?.name ?? 'Unassigned'}
        onSelect={(entry) => setSelected(entry.opportunity)}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SensitivityPanel sensitivity={forecast.sensitivity} target={metrics.target} />
        <ScenarioSimulator
          inputs={simulator}
          onChange={setSimulator}
          onReset={resetSimulator}
          result={simulation}
          baseValue={forecast.value}
          target={metrics.target}
        />
      </div>

      <SnapshotsPanel
        snapshots={periodSnapshots}
        accuracy={accuracy}
        onSave={saveSnapshot}
        onClear={clearSnapshots}
        currentValue={selectedScenario.value}
      />

      <p className="text-xs leading-relaxed text-ink-faint">
        Viewing the {selectedScenario.label.toLowerCase()} at{' '}
        <span className="tnum text-ink-subtle">{fmt.currency(selectedScenario.value)}</span>.{' '}
        {forecast.methodology}
      </p>

      {/* The same drawer the Pipeline uses: one place a deal is read and moved. */}
      <DealDetailPanel
        opportunity={selected}
        now={now}
        onClose={() => setSelected(null)}
        onEdit={() => navigate('/pipeline')}
        onDelete={(id) => {
          deleteOpportunity(id)
          setSelected(null)
        }}
        onMove={(id, stage) => {
          moveOpportunity(id, stage)
          setSelected(null)
        }}
      />
    </div>
  )
}
