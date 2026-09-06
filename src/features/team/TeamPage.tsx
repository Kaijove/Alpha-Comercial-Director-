import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { createRep } from '@/domain/defaults'
import { repMonthlyTarget } from '@/domain/metrics/repTargets'
import { repRevenueTrend } from '@/domain/metrics/repTrend'
import type { SalesRep } from '@/domain/workspace'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toastContext'
import { useFormatters } from '@/hooks/useFormatters'
import {
  ActivityPerformance,
  CoachingSignals,
  PerformanceTrend,
} from './components/TeamAnalysisPanels'
import { RepComparison } from './components/RepComparison'
import { RepDetailPanel } from './components/RepDetailPanel'
import {
  RepFormPanel,
  draftFromRep,
  emptyRepDraft,
  type RepDraft,
} from './components/RepFormPanel'
import { TeamFilters, TeamKpis } from './components/TeamHeader'
import {
  NeedsAttention,
  PipelineByRep,
  TopPerformers,
  WinRateByRep,
} from './components/TeamPanels'
import { TeamRanking } from './components/TeamRanking'
import { useTeamData } from './useTeamData'

type FormState = { mode: 'create' } | { mode: 'edit'; ownerId: string } | null

/**
 * Sales Team & Performance Management.
 *
 * The roster lives in the workspace, so adding or editing a rep here is the
 * same write Settings performs and shows up immediately in the Pipeline owner
 * selector, the Dashboard and Analytics. Per-rep figures come from the shared
 * `computeRepMetrics`, so nothing on this page can disagree with those screens.
 */
export function TeamPage() {
  const { workspace, updateWorkspace } = useWorkspace()
  const { dataset, reassignOpportunities, countOpportunitiesFor } = useCommercialData()
  const { notify } = useToast()
  const fmt = useFormatters()
  const navigate = useNavigate()

  const {
    now,
    period,
    periodTarget,
    filters,
    setFilters,
    clearFilters,
    rows,
    benchmarks,
    coaching,
    header,
    regions,
    needsAttention,
  } = useTeamData()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [reassignTo, setReassignTo] = useState<string>('')

  const [trendSelection, setTrendSelection] = useState<string[]>(() =>
    dataset.owners.slice(0, 3).map((owner) => owner.id),
  )
  const [compareSelection, setCompareSelection] = useState<string[]>(() =>
    dataset.owners.slice(0, 2).map((owner) => owner.id),
  )

  const trendData = useMemo(
    () =>
      repRevenueTrend(
        dataset.opportunities,
        trendSelection,
        6,
        now,
        fmt.locale,
        workspace && workspace.team.length > 0
          ? workspace.goals.monthlyTarget / workspace.team.length
          : 0,
      ),
    [dataset.opportunities, trendSelection, now, fmt.locale, workspace],
  )

  const selectedRow = selectedId
    ? (rows.find((row) => row.owner.id === selectedId) ?? null)
    : null

  const removingRep = removing
    ? (workspace?.team.find((rep) => rep.id === removing) ?? null)
    : null
  const removingDealCount = removing ? countOpportunitiesFor(removing) : 0
  const reassignCandidates = (workspace?.team ?? []).filter((rep) => rep.id !== removing)

  const formDraft: RepDraft | null = useMemo(() => {
    if (!form || !workspace) return null
    if (form.mode === 'edit') {
      const rep = workspace.team.find((entry) => entry.id === form.ownerId)
      return rep ? draftFromRep(rep, workspace) : null
    }
    return emptyRepDraft(workspace)
  }, [form, workspace])

  if (!workspace) return null

  const toggle = (list: string[], id: string, max: number) =>
    list.includes(id)
      ? list.filter((entry) => entry !== id)
      : list.length >= max
        ? list
        : [...list, id]

  const applyDraft = (rep: SalesRep, draft: RepDraft): SalesRep => ({
    ...rep,
    name: draft.name.trim(),
    role: draft.role,
    region: draft.region || null,
    email: draft.email.trim() || null,
    monthlyTarget: draft.customTargets ? draft.monthlyTarget : null,
    annualTarget: draft.customTargets ? draft.annualTarget : null,
  })

  const handleSubmit = (draft: RepDraft) => {
    if (form?.mode === 'edit') {
      const next = workspace.team.map((rep) =>
        rep.id === form.ownerId ? applyDraft(rep, draft) : rep,
      )
      updateWorkspace({ team: next })
      notify({ title: 'Sales rep updated' })
    } else {
      const base = createRep(draft.name.trim(), draft.role, workspace.team.length)
      updateWorkspace({ team: [...workspace.team, applyDraft(base, draft)] })
      notify({
        title: 'Sales rep added',
        description: 'They now appear in the ranking, the filters and the pipeline.',
      })
    }
    setForm(null)
  }

  const confirmRemove = () => {
    if (!removing) return
    const rep = workspace.team.find((entry) => entry.id === removing)

    if (removingDealCount > 0) {
      if (!reassignTo) return
      const moved = reassignOpportunities(removing, reassignTo)
      const target = workspace.team.find((entry) => entry.id === reassignTo)
      notify({
        title: 'Opportunities reassigned',
        description: `${moved} ${moved === 1 ? 'opportunity' : 'opportunities'} moved to ${target?.name ?? 'another rep'}.`,
      })
    }

    updateWorkspace({ team: workspace.team.filter((entry) => entry.id !== removing) })
    setTrendSelection((current) => current.filter((id) => id !== removing))
    setCompareSelection((current) => current.filter((id) => id !== removing))
    setSelectedId(null)
    setRemoving(null)
    setReassignTo('')
    notify({ title: `${rep?.name ?? 'Sales rep'} removed`, tone: 'warning' })
  }

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-page font-semibold text-ink">
            Sales Team
          </h1>
          <p className="text-sm text-ink-muted">
            Monitor performance, identify trends and keep your team on track.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setForm({ mode: 'create' })}
          iconLeft={<UserPlus className="size-4" />}
        >
          Add sales rep
        </Button>
      </header>

      <TeamKpis stats={header} />

      <TeamFilters
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        owners={dataset.owners}
        regions={regions}
      />

      <TeamRanking rows={rows} now={now} onOpen={setSelectedId} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <NeedsAttention rows={needsAttention} onOpen={setSelectedId} />
        <TopPerformers rows={rows} onOpen={setSelectedId} />
      </div>

      <PerformanceTrend
        data={trendData}
        rows={rows}
        selected={trendSelection}
        onToggle={(id) => setTrendSelection((current) => toggle(current, id, 5))}
        showTarget={workspace.team.length > 0}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <PipelineByRep rows={rows} benchmarks={benchmarks} onOpen={setSelectedId} />
        <WinRateByRep rows={rows} benchmarks={benchmarks} onOpen={setSelectedId} />
      </div>

      <ActivityPerformance rows={rows} benchmarks={benchmarks} onOpen={setSelectedId} />

      <CoachingSignals signals={coaching} onOpen={setSelectedId} />

      <RepComparison
        rows={rows}
        benchmarks={benchmarks}
        selected={compareSelection}
        onToggle={(id) => setCompareSelection((current) => toggle(current, id, 4))}
      />

      <RepDetailPanel
        row={selectedRow}
        now={now}
        periodLabel={period.label}
        onClose={() => setSelectedId(null)}
        onEdit={(ownerId) => setForm({ mode: 'edit', ownerId })}
        onRemove={(ownerId) => {
          setRemoving(ownerId)
          setReassignTo('')
        }}
        onOpenOpportunity={() => navigate('/pipeline')}
      />

      {form && formDraft ? (
        <RepFormPanel
          mode={form.mode}
          draft={formDraft}
          onSubmit={handleSubmit}
          onClose={() => setForm(null)}
        />
      ) : null}

      <Modal
        open={Boolean(removingRep)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removingRep?.name ?? 'this rep'}?`}
        description={
          removingDealCount > 0
            ? `They own ${removingDealCount} ${removingDealCount === 1 ? 'opportunity' : 'opportunities'}. Choose who takes them over — nothing is deleted.`
            : 'They have no opportunities assigned, so nothing else changes.'
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={removingDealCount > 0 && !reassignTo}
              onClick={confirmRemove}
            >
              {removingDealCount > 0 ? 'Reassign and remove' : 'Remove rep'}
            </Button>
          </>
        }
      >
        {removingDealCount > 0 ? (
          reassignCandidates.length > 0 ? (
            <Select
              label="Reassign their opportunities to"
              placeholder="Choose a sales rep"
              value={reassignTo}
              options={reassignCandidates.map((rep) => ({
                value: rep.id,
                label: `${rep.name} · ${countOpportunitiesFor(rep.id)} deals`,
              }))}
              hint={`${removingDealCount} ${removingDealCount === 1 ? 'opportunity keeps' : 'opportunities keep'} its full history, including activity.`}
              onChange={(event) => setReassignTo(event.target.value)}
            />
          ) : (
            <p className="text-body leading-relaxed text-warning">
              There is nobody else on the roster to take these opportunities over. Add
              another rep first, or the deals would be left unassigned.
            </p>
          )
        ) : null}
      </Modal>

      {/* Quota context, kept out of the KPI strip so it stays quiet. */}
      {workspace.team.length > 0 ? (
        <p className="px-1 text-xs text-ink-faint">
          Reps without an individual quota carry an equal share of the{' '}
          {fmt.currency(periodTarget)} {period.label.toLowerCase()} commitment, which is{' '}
          {fmt.currency(repMonthlyTarget(workspace.team[0], workspace) * (periodTarget / Math.max(workspace.goals.monthlyTarget, 1)))} each.
        </p>
      ) : null}
    </div>
  )
}
