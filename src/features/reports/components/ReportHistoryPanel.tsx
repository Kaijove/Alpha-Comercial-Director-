import { FileText, RotateCcw, Trash2 } from 'lucide-react'
import type { SavedReport } from '@/domain/reports/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * Recently generated reports.
 *
 * What is stored is the configuration, not a rendered file: opening one puts
 * the settings back and re-runs the engines over live data. For a closed period
 * that reproduces the document exactly; for the current one it shows where the
 * period actually stands now, which is more useful than a stale copy and is the
 * only version that cannot quietly go out of date.
 */
export function ReportHistoryPanel({
  history,
  onOpen,
  onDelete,
  onClear,
}: {
  history: SavedReport[]
  onOpen: (entry: SavedReport) => void
  onDelete: (id: string) => void
  onClear: () => void
}) {
  const fmt = useFormatters()

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Report History"
        description="The last reports generated in this browser."
        action={
          history.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              iconLeft={<Trash2 className="size-3.5" aria-hidden />}
            >
              Clear
            </Button>
          ) : null
        }
      />

      {history.length === 0 ? (
        <p className="mt-5 text-body leading-relaxed text-ink-muted">
          No reports generated yet. Exporting or printing a report records it here so you can
          reopen the same configuration later.
        </p>
      ) : (
        <ul className="mt-5 space-y-px overflow-hidden rounded-panel border border-line bg-line">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-surface px-4 py-3"
            >
              <FileText className="size-3.5 shrink-0 text-ink-faint" aria-hidden />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-body text-ink">{entry.typeLabel}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-faint">
                  <span>{entry.periodTitle}</span>
                  <span aria-hidden>·</span>
                  <span>{fmt.date(entry.createdAt)}</span>
                  <span aria-hidden>·</span>
                  <span className="tnum">{fmt.currency(entry.snapshot.revenue)} revenue</span>
                  {entry.snapshot.attainment !== null ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="tnum">
                        {fmt.percent(entry.snapshot.attainment, 0)} attainment
                      </span>
                    </>
                  ) : null}
                </span>
              </span>

              <Badge tone="outline">{entry.format.toUpperCase()}</Badge>

              <span className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpen(entry)}
                  iconLeft={<RotateCcw className="size-3.5" aria-hidden />}
                >
                  Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(entry.id)}
                  aria-label={`Delete ${entry.typeLabel} for ${entry.periodTitle}`}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
