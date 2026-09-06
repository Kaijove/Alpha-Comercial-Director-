import { CircleCheck, CircleAlert } from 'lucide-react'
import type { ForecastDataQuality } from '@/domain/forecast/types'
import { Panel, PanelHeader } from '@/components/ui/Panel'
import { Badge } from '@/components/ui/Badge'
import { ScoreRail } from './ForecastVisuals'

/**
 * How much the forecast can be trusted as an artefact of its inputs.
 *
 * Bad records are not silently swallowed: they are counted, priced, and named,
 * so a low score reads as "fix these three deals" rather than "distrust the
 * model".
 */
export function DataQualityPanel({ quality }: { quality: ForecastDataQuality }) {
  const tone = quality.score >= 90 ? 'positive' : quality.score >= 70 ? 'accent' : 'warning'

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Forecast Data Quality"
        description="What the model had to work with across the open pipeline."
        action={<Badge tone={tone}>{quality.score}%</Badge>}
      />

      <div className="mt-5 space-y-2">
        <ScoreRail score={quality.score} tone={tone} />
        <p className="text-body leading-relaxed text-ink-muted">{quality.summary}</p>
      </div>

      {quality.issues.length > 0 ? (
        <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
          {quality.issues.map((issue) => (
            <li key={issue.key} className="flex items-start gap-2.5 text-body">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
              <span className="flex-1 text-ink-muted">{issue.label}</span>
              <span className="tnum shrink-0 text-xs text-ink-faint">−{issue.penalty}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 flex items-center gap-2.5 border-t border-line pt-5 text-body text-ink-muted">
          <CircleCheck className="size-3.5 shrink-0 text-positive" aria-hidden />
          Nothing is missing from the records the forecast reads.
        </p>
      )}
    </Panel>
  )
}
