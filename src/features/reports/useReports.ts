import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCommercialData } from '@/app/providers/commercialDataContext'
import { useInsightStatus } from '@/app/providers/insightStatusContext'
import { useReadyWorkspace } from '@/app/providers/workspaceContext'
import { localReportRepository } from '@/data/repository/reportRepository'
import { buildReport } from '@/domain/reports/reportEngine'
import { buildCsv, type CsvDataset } from '@/domain/reports/csvExport'
import { buildFileName } from '@/domain/reports/reportNaming'
import { isBlocked, validateReport } from '@/domain/reports/reportValidation'
import type { CustomRange, ReportPeriodKey } from '@/domain/reports/reportPeriods'
import {
  REPORT_TYPES,
  type ReportConfig,
  type ReportFormat,
  type ReportSectionKey,
  type ReportType,
  type SavedReport,
} from '@/domain/reports/types'
import { downloadCsv } from '@/lib/download'
import { useFormatters } from '@/hooks/useFormatters'
import { useToast } from '@/components/ui/toastContext'

/**
 * One derivation pass for the Reports page.
 *
 * The document is memoised on its configuration and the live data, so moving a
 * section toggle does not re-run the engines, and re-running them is a single
 * pass rather than one per panel on the page.
 */
function defaultConfig(): ReportConfig {
  const executive = REPORT_TYPES[0]
  return {
    type: executive.value,
    period: 'this-month',
    sections: [...executive.sections],
    ownerId: null,
  }
}

export function useReports() {
  const workspace = useReadyWorkspace()
  const { dataset, activitiesFor, customerById, ownerById } = useCommercialData()
  const { statuses } = useInsightStatus()
  const fmt = useFormatters()
  const toast = useToast()

  const [config, setConfig] = useState<ReportConfig>(defaultConfig)

  // Pinned per mount: a report must not shift under the director while they
  // read it, and the generation timestamp has to match what the document says.
  const now = useMemo(() => new Date(), [])

  const engineFormatters = useMemo(
    () => ({
      currency: fmt.currency,
      percent: fmt.percent,
      points: fmt.points,
      number: fmt.number,
      date: (value: string | Date) => fmt.date(value),
      shortDate: (value: string | Date) => fmt.shortDate(value),
    }),
    [fmt],
  )

  const document = useMemo(
    () =>
      buildReport({
        config,
        dataset,
        workspace,
        now,
        fmt: engineFormatters,
        statuses,
        activitiesFor,
        customerName: (id) => customerById(id)?.name ?? 'Unknown account',
        ownerName: (id) => ownerById(id)?.name ?? 'Unassigned',
      }),
    [
      config,
      dataset,
      workspace,
      now,
      engineFormatters,
      statuses,
      activitiesFor,
      customerById,
      ownerById,
    ],
  )

  const issues = useMemo(
    () => validateReport(config, workspace, document),
    [config, workspace, document],
  )
  const blocked = isBlocked(issues)

  // --- Configuration -------------------------------------------------------
  const setType = useCallback((type: ReportType) => {
    const definition = REPORT_TYPES.find((entry) => entry.value === type)
    setConfig((current) => ({
      ...current,
      type,
      // Choosing a type resets the sections to that type's own set: the toggles
      // describe the report you picked, not the one you picked before it.
      sections: definition ? [...definition.sections] : current.sections,
    }))
  }, [])

  const setPeriod = useCallback((period: ReportPeriodKey) => {
    setConfig((current) => ({ ...current, period }))
  }, [])

  const setCustomRange = useCallback((custom: CustomRange) => {
    setConfig((current) => ({ ...current, custom }))
  }, [])

  const setOwner = useCallback((ownerId: string | null) => {
    setConfig((current) => ({ ...current, ownerId }))
  }, [])

  const toggleSection = useCallback((section: ReportSectionKey) => {
    setConfig((current) => ({
      ...current,
      sections: current.sections.includes(section)
        ? current.sections.filter((entry) => entry !== section)
        : [...current.sections, section],
    }))
  }, [])

  // --- History -------------------------------------------------------------
  const [history, setHistory] = useState<SavedReport[]>(() => localReportRepository.load())

  useEffect(() => {
    localReportRepository.save(history)
  }, [history])

  const record = useCallback(
    (format: ReportFormat) => {
      const createdAt = new Date().toISOString()
      const entry: SavedReport = {
        id: `${config.type}:${document.period.key}:${document.period.start.toISOString().slice(0, 10)}:${createdAt}`,
        name: `${document.typeLabel} — ${document.meta.periodTitle}`,
        type: config.type,
        typeLabel: document.typeLabel,
        periodTitle: document.meta.periodTitle,
        config: { ...config, sections: [...config.sections] },
        createdAt,
        format,
        company: document.meta.companyName,
        snapshot: {
          revenue: document.metrics.revenue,
          target: document.metrics.target,
          forecast: document.forecast.value,
          attainment: document.metrics.attainment,
        },
      }
      setHistory((current) => [...current, entry])
    },
    [config, document],
  )

  const openSaved = useCallback((entry: SavedReport) => {
    setConfig({ ...entry.config, sections: [...entry.config.sections] })
  }, [])

  const deleteSaved = useCallback((id: string) => {
    setHistory((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  // --- Export --------------------------------------------------------------
  const exportPdf = useCallback(() => {
    if (blocked) return
    record('pdf')
    // The browser's own print pipeline produces the PDF: real A4, vector text,
    // selectable content and crisp charts, with no dependency and nothing
    // leaving the machine. The print stylesheet hides the application shell so
    // what is printed is the document alone.
    window.print()
  }, [blocked, record])

  const printReport = useCallback(() => {
    if (blocked) return
    record('print')
    window.print()
  }, [blocked, record])

  const exportCsv = useCallback(
    (csvDataset: CsvDataset) => {
      if (blocked) return
      const content = buildCsv(csvDataset, document, {
        customer: (id) => customerById(id)?.name ?? 'Unknown account',
        owner: (id) => ownerById(id)?.name ?? 'Unassigned',
      })
      const filename = buildFileName({
        company: document.meta.companyName,
        reportTitle: document.typeLabel,
        period: document.period,
        extension: 'csv',
        dataset: csvDataset,
      })
      downloadCsv(content, filename)
      record('csv')
      toast.notify({ title: 'CSV exported', description: filename, tone: 'success' })
    },
    [blocked, document, customerById, ownerById, record, toast],
  )

  const pdfFileName = useMemo(
    () =>
      buildFileName({
        company: document.meta.companyName,
        reportTitle: document.typeLabel,
        period: document.period,
        extension: 'pdf',
      }),
    [document],
  )

  return {
    config,
    setType,
    setPeriod,
    setCustomRange,
    setOwner,
    toggleSection,
    document,
    issues,
    blocked,
    owners: dataset.owners,
    history: useMemo(
      () => [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      [history],
    ),
    openSaved,
    deleteSaved,
    clearHistory,
    exportPdf,
    exportCsv,
    printReport,
    pdfFileName,
  }
}

export type ReportsViewModel = ReturnType<typeof useReports>
