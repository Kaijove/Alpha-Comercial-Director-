import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { productsForSector } from '@/data/seed/dictionaries'
import type { Stage } from '@/domain/commerce'
import {
  draftFromOpportunity,
  emptyDraft,
  type OpportunityDraft,
} from '@/domain/pipeline/opportunityMutations'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { addDays } from '@/lib/dates'
import {
  ClosingSoon,
  StalledOpportunities,
  TopOpportunitiesPanel,
} from './components/AttentionPanels'
import { DealDetailPanel } from './components/DealDetailPanel'
import { DealFormPanel } from './components/DealFormPanel'
import { KanbanBoard } from './components/KanbanBoard'
import { PipelineKpis } from './components/PipelineKpis'
import { PipelineTable } from './components/PipelineTable'
import { PipelineToolbar } from './components/PipelineToolbar'
import { usePipelineData } from './usePipelineData'

type FormState = { mode: 'create' } | { mode: 'edit'; id: string } | null

/**
 * Sales Pipeline.
 *
 * Every mutation goes through the shared commercial data provider, so a change
 * made here is already reflected on the Dashboard and in Analytics, and is
 * persisted before the panel closes.
 */
export function PipelinePage() {
  const workspace = useReadyWorkspace()
  const {
    dataset,
    opportunityById,
    createOpportunity,
    updateOpportunity,
    moveOpportunity,
    deleteOpportunity,
  } = useCommercialData()
  const { notify } = useToast()

  const { now, view, setView, filters, setFilters, clearFilters, scoped, metrics } =
    usePipelineData()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const products = useMemo(
    () => productsForSector(workspace.company.sector),
    [workspace.company.sector],
  )

  const selected = selectedId ? (opportunityById(selectedId) ?? null) : null
  const deleting = pendingDelete ? (opportunityById(pendingDelete) ?? null) : null

  const formDraft: OpportunityDraft | null = useMemo(() => {
    if (!form) return null
    if (form.mode === 'edit') {
      const opportunity = opportunityById(form.id)
      return opportunity ? draftFromOpportunity(opportunity) : null
    }
    return emptyDraft({
      ownerId: dataset.owners[0]?.id ?? '',
      customerId: dataset.customers[0]?.id ?? '',
      product: products[0] ?? '',
      source: 'Inbound',
      expectedCloseDate: addDays(now, 30).toISOString().slice(0, 10),
    })
  }, [form, opportunityById, dataset.owners, dataset.customers, products, now])

  const handleMove = (id: string, stage: Stage) => {
    const opportunity = opportunityById(id)
    if (!opportunity || opportunity.stage === stage) return
    moveOpportunity(id, stage)
    notify({
      title: 'Stage updated',
      description: `${opportunity.name} moved to ${stage}.`,
    })
  }

  const handleSubmit = (draft: OpportunityDraft) => {
    if (form?.mode === 'edit') {
      updateOpportunity(form.id, draft)
      notify({ title: 'Opportunity updated' })
    } else {
      const created = createOpportunity(draft)
      notify({
        title: 'Opportunity created',
        description: 'It is now in the pipeline and counted in every figure.',
      })
      setSelectedId(created.id)
    }
    setForm(null)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    deleteOpportunity(pendingDelete)
    setPendingDelete(null)
    setSelectedId(null)
    notify({ title: 'Opportunity deleted', tone: 'warning' })
  }

  return (
    <div className="animate-rise space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-page font-semibold text-ink">
            Sales Pipeline
          </h1>
          <p className="text-sm text-ink-muted">
            Manage opportunities and keep deals moving.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setForm({ mode: 'create' })}
          iconLeft={<Plus className="size-4" />}
        >
          New opportunity
        </Button>
      </header>

      <PipelineKpis metrics={metrics} />

      <PipelineToolbar
        view={view}
        onViewChange={setView}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={clearFilters}
        owners={dataset.owners}
        resultCount={scoped.length}
      />

      {view === 'kanban' ? (
        <KanbanBoard
          board={metrics.board}
          now={now}
          onOpen={setSelectedId}
          onMove={handleMove}
        />
      ) : (
        <PipelineTable opportunities={scoped} now={now} onOpen={setSelectedId} />
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <StalledOpportunities
          opportunities={metrics.stalled}
          now={now}
          onOpen={setSelectedId}
        />
        <ClosingSoon opportunities={metrics.closingSoon} now={now} onOpen={setSelectedId} />
        <TopOpportunitiesPanel
          highestValue={metrics.highestValue}
          highestProbability={metrics.highestProbability}
          onOpen={setSelectedId}
        />
      </div>

      <DealDetailPanel
        opportunity={selected}
        now={now}
        onClose={() => setSelectedId(null)}
        onEdit={(id) => setForm({ mode: 'edit', id })}
        onDelete={(id) => setPendingDelete(id)}
        onMove={handleMove}
      />

      {form && formDraft ? (
        <DealFormPanel
          mode={form.mode}
          draft={formDraft}
          products={products}
          onSubmit={handleSubmit}
          onClose={() => setForm(null)}
        />
      ) : null}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setPendingDelete(null)}
        title="Delete this opportunity?"
        description={
          deleting
            ? `Deleting "${deleting.name}" removes it from your pipeline and from every figure that includes it. This cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete}>
              Delete opportunity
            </Button>
          </>
        }
      />
    </div>
  )
}
