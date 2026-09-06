import { FileDown, Printer, Sheet, TriangleAlert } from 'lucide-react'
import { CSV_DATASETS, type CsvDataset } from '@/domain/reports/csvExport'
import type { ValidationIssue } from '@/domain/reports/reportValidation'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/**
 * Export.
 *
 * The PDF comes out of the browser's own print pipeline rather than a bundled
 * renderer: real A4, vector text that stays selectable and searchable, charts
 * and tables that reflow across pages properly, and nothing added to the
 * bundle. Everything happens on the machine - no file, and no figure inside
 * one, is ever uploaded anywhere.
 *
 * Blocking validation issues disable the buttons rather than producing a broken
 * document, and each says what to do about it.
 */
export function ExportBar({
  issues,
  blocked,
  fileName,
  onPdf,
  onPrint,
  onCsv,
}: {
  issues: ValidationIssue[]
  blocked: boolean
  fileName: string
  onPdf: () => void
  onPrint: () => void
  onCsv: (dataset: CsvDataset) => void
}) {
  const blocking = issues.filter((issue) => issue.level === 'blocking')
  const warnings = issues.filter((issue) => issue.level === 'warning')

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Export"
        description="Everything is generated in this browser. Nothing is uploaded."
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={onPdf}
          disabled={blocked}
          iconLeft={<FileDown className="size-4" aria-hidden />}
        >
          Export PDF
        </Button>
        <Button
          variant="secondary"
          onClick={onPrint}
          disabled={blocked}
          iconLeft={<Printer className="size-4" aria-hidden />}
        >
          Print
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        Export PDF opens your browser&apos;s print dialog — choose <em>Save as PDF</em> as the
        destination. The document prints as{' '}
        <span className="text-ink-subtle">{fileName}</span> on A4, with the application
        interface hidden.
      </p>

      <div className="mt-6 space-y-2 border-t border-line pt-5">
        <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
          Export data as CSV
        </p>
        <ul className="space-y-px overflow-hidden rounded-panel border border-line bg-line">
          {CSV_DATASETS.map((dataset) => (
            <li key={dataset.value}>
              <button
                type="button"
                onClick={() => onCsv(dataset.value)}
                disabled={blocked}
                className="flex w-full items-center gap-3 bg-surface px-4 py-2.5 text-left transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sheet className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-body text-ink">{dataset.label}</span>
                  <span className="block truncate text-xs text-ink-faint">
                    {dataset.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {blocking.length > 0 || warnings.length > 0 ? (
        <div className="mt-6 space-y-3 border-t border-line pt-5">
          {blocking.length > 0 ? (
            <div className="space-y-2">
              <Badge tone="negative">
                <TriangleAlert className="size-3" aria-hidden />
                Export blocked
              </Badge>
              <ul className="space-y-1.5">
                {blocking.map((issue) => (
                  <li key={issue.message} className="text-body leading-relaxed text-negative">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-2">
              <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                Worth knowing before you send it
              </p>
              <ul className="space-y-1.5">
                {warnings.map((issue) => (
                  <li key={issue.message} className="text-xs leading-relaxed text-ink-muted">
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Panel>
  )
}
