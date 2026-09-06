import { useReports } from './useReports'
import { ExportBar } from './components/ExportBar'
import { ReportConfigPanel } from './components/ReportConfigPanel'
import { ReportDocumentView } from './components/ReportDocumentView'
import { ReportHistoryPanel } from './components/ReportHistoryPanel'

/**
 * Reports.
 *
 * A report centre rather than a page of export buttons: choose what to produce,
 * see the document that will come out, then send it.
 *
 * Every figure in the preview comes from the same engines the rest of the
 * product runs. `data-print` marks which half of the screen is the application
 * and which half is the document, so printing produces the document alone.
 */
export function ReportsPage() {
  const {
    config,
    setType,
    setPeriod,
    setCustomRange,
    setOwner,
    toggleSection,
    document,
    issues,
    blocked,
    owners,
    history,
    openSaved,
    deleteSaved,
    clearHistory,
    exportPdf,
    exportCsv,
    printReport,
    pdfFileName,
  } = useReports()

  return (
    <div className="animate-rise space-y-7">
      <header data-print="hide" className="space-y-2">
        <h1 className="text-page font-semibold text-ink">Reports</h1>
        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">
          Turn what the command center knows into a document you can send. Every figure comes
          from the same calculations the rest of the product uses, and nothing leaves this
          browser.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div data-print="hide" className="space-y-6">
          <ReportConfigPanel
            config={config}
            owners={owners}
            onType={setType}
            onPeriod={setPeriod}
            onCustomRange={setCustomRange}
            onOwner={setOwner}
            onToggleSection={toggleSection}
          />

          <ExportBar
            issues={issues}
            blocked={blocked}
            fileName={pdfFileName}
            onPdf={exportPdf}
            onPrint={printReport}
            onCsv={exportCsv}
          />
        </div>

        {/* The document. Everything else on screen is application chrome. */}
        <div data-print="document" className="min-w-0">
          <p data-print="hide" className="mb-3 text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint">
            Report preview
          </p>
          <div className="overflow-hidden rounded-panel border border-line bg-white shadow-panel">
            <div className="max-h-[1400px] overflow-y-auto">
              <ReportDocumentView document={document} />
            </div>
          </div>
        </div>
      </div>

      <div data-print="hide">
        <ReportHistoryPanel
          history={history}
          onOpen={openSaved}
          onDelete={deleteSaved}
          onClear={clearHistory}
        />
      </div>
    </div>
  )
}
