import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, HardDrive, RotateCcw } from 'lucide-react'
import { useWorkspace } from '@/app/providers/workspaceContext'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { formatDate } from '@/lib/format'
import { SettingsSection } from '../SettingsSection'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 text-body">
      <span className="text-ink-muted">{label}</span>
      <span className="tnum text-ink">{value}</span>
    </div>
  )
}

export function DataSection() {
  const { workspace, exportWorkspace, resetWorkspace, persistenceIsDurable } = useWorkspace()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const serialized = exportWorkspace()
  const sizeKb = (new Blob([serialized]).size / 1024).toFixed(1)

  const download = () => {
    const blob = new Blob([serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'commercial-command-center-workspace.json'
    anchor.click()
    URL.revokeObjectURL(url)
    notify({ title: 'Workspace exported', description: 'Saved to your downloads.' })
  }

  const reset = () => {
    resetWorkspace()
    setConfirmOpen(false)
    navigate('/onboarding', { replace: true })
  }

  return (
    <SettingsSection
      title="Data & reset"
      description="Your workspace lives in this browser. Nothing is uploaded anywhere."
    >
      <div className="space-y-6">
        <div className="rounded-panel border border-line bg-surface px-5 py-1">
          <InfoRow label="Storage" value={persistenceIsDurable ? 'localStorage' : 'Session only'} />
          <div className="border-t border-line" />
          <InfoRow label="Workspace size" value={`${sizeKb} KB`} />
          <div className="border-t border-line" />
          <InfoRow
            label="Created"
            value={formatDate(workspace!.createdAt, workspace!.preferences.locale)}
          />
          <div className="border-t border-line" />
          <InfoRow
            label="Last change"
            value={formatDate(workspace!.updatedAt, workspace!.preferences.locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
        </div>

        {!persistenceIsDurable ? (
          <p className="flex items-start gap-2 rounded-panel border border-warning/25 bg-warning/8 p-4 text-body leading-relaxed text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            This browser is blocking local storage, so your workspace will disappear when the
            tab closes. Export a copy if you want to keep it.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={download} iconLeft={<Download className="size-3.5" />}>
            Export workspace
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            iconLeft={<RotateCcw className="size-3.5" />}
          >
            Reset and start over
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
          <HardDrive className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Everything stays in this browser. If a CRM or backend is connected later, this is
          where its sync settings will live.
        </p>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset this workspace?"
        description="Your profile, company, targets and team will be deleted from this browser and the setup will start again. This cannot be undone."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={reset}>
              Delete and start over
            </Button>
          </>
        }
      />
    </SettingsSection>
  )
}
