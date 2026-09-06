import { useState } from 'react'
import { STAGE_LABELS, type Stage } from '@/domain/commerce'
import type { StageBoardBucket } from '@/domain/metrics/pipelineMetrics'
import { CLOSED_COLUMN_DAYS } from '@/domain/metrics/pipelineMetrics'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { DealCard } from './DealCard'

const stageAccent: Record<Stage, string> = {
  lead: 'bg-neutral',
  qualified: 'bg-accent/60',
  proposal: 'bg-accent',
  negotiation: 'bg-warning',
  won: 'bg-positive',
  lost: 'bg-negative',
}

/**
 * The board.
 *
 * Columns scroll horizontally on desktop, which is the expected Kanban feel,
 * and stack vertically below `lg` so a phone gets a usable list instead of a
 * wide sideways scroll. Dragging is the fast path for a mouse; the detail panel
 * carries a stage control so touch and keyboard can move a deal too.
 */
export function KanbanBoard({
  board,
  now,
  onOpen,
  onMove,
}: {
  board: StageBoardBucket[]
  now: Date
  onOpen: (id: string) => void
  onMove: (id: string, stage: Stage) => void
}) {
  const fmt = useFormatters()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:overflow-x-auto lg:pb-3">
      {board.map((column) => {
        const isClosedColumn = column.stage === 'won' || column.stage === 'lost'

        return (
          <section
            key={column.stage}
            onDragOver={(event) => {
              if (!draggingId) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setOverStage(column.stage)
            }}
            onDragLeave={() => setOverStage((current) => (current === column.stage ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData('text/plain')
              setOverStage(null)
              setDraggingId(null)
              if (id) onMove(id, column.stage)
            }}
            className={cn(
              'flex flex-col rounded-panel border bg-surface/60 transition-colors duration-150',
              'lg:w-[292px] lg:shrink-0',
              overStage === column.stage
                ? 'border-accent/50 bg-accent/[0.04]'
                : 'border-line',
            )}
          >
            <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span
                className={cn('size-1.5 shrink-0 rounded-full', stageAccent[column.stage])}
                aria-hidden
              />
              <h3 className="text-body font-medium text-ink">
                {STAGE_LABELS[column.stage]}
              </h3>
              <span className="tnum ml-auto text-xs text-ink-faint">
                {column.count} {column.count === 1 ? 'deal' : 'deals'}
              </span>
            </header>

            <div className="flex items-baseline justify-between gap-2 px-4 py-2.5">
              <span className="tnum text-title font-semibold tracking-tight text-ink">
                {fmt.currency(column.value)}
              </span>
              {!isClosedColumn ? (
                <span className="tnum text-xs text-ink-faint">
                  {fmt.currency(column.weighted)} weighted
                </span>
              ) : (
                <span className="text-xs text-ink-faint">last {CLOSED_COLUMN_DAYS}d</span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-2 px-3 pb-3 lg:max-h-[620px] lg:overflow-y-auto">
              {column.opportunities.length === 0 ? (
                <p className="rounded-field border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                  {isClosedColumn
                    ? `Nothing closed in the last ${CLOSED_COLUMN_DAYS} days`
                    : 'No opportunities in this stage'}
                </p>
              ) : (
                column.opportunities.map((opportunity) => (
                  <DealCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    now={now}
                    onOpen={onOpen}
                    dragging={draggingId === opportunity.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setOverStage(null)
                    }}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
