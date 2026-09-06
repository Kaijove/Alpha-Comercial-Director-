import { Link } from 'react-router-dom'
import { ArrowRight, Check, RotateCcw, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type Insight,
  type InsightStatus,
} from '@/domain/intelligence/types'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useFormatters } from '@/hooks/useFormatters'
import { cn } from '@/lib/cn'
import { SeverityBadge, categoryIcon, severityTone, statusTone } from './InsightVisuals'

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-subtle">
      {children}
    </p>
  )
}

/**
 * The full case for one insight.
 *
 * The "Why am I seeing this?" block is the important part: it lists the exact
 * conditions the rule tested, so the director can disagree with the conclusion
 * on the evidence rather than having to trust it.
 */
export function InsightDetailPanel({
  insight,
  onClose,
  onStatus,
  onReopen,
}: {
  insight: Insight | null
  onClose: () => void
  onStatus: (id: string, status: InsightStatus) => void
  onReopen: (id: string) => void
}) {
  const fmt = useFormatters()
  if (!insight) return null

  const tone = severityTone[insight.severity]
  const Icon = categoryIcon[insight.category]
  const closed = insight.status === 'resolved' || insight.status === 'dismissed'

  return (
    <Drawer
      open
      onClose={onClose}
      title={insight.title}
      description={`${CATEGORY_LABELS[insight.category]} · ${SEVERITY_LABELS[insight.severity]}`}
      footer={
        closed ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onReopen(insight.id)}
            iconLeft={<RotateCcw className="size-3.5" />}
          >
            Reopen insight
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onStatus(insight.id, 'dismissed')}
              iconLeft={<X className="size-3.5" />}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onStatus(insight.id, 'resolved')}
              iconLeft={<Check className="size-3.5" />}
            >
              Mark resolved
            </Button>
          </>
        )
      }
    >
      <div className="space-y-7">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SeverityBadge severity={insight.severity} />
            <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.1em] text-ink-faint">
              <Icon className="size-3" aria-hidden />
              {CATEGORY_LABELS[insight.category]}
            </span>
            <span
              className={cn(
                'text-2xs uppercase tracking-[0.1em]',
                statusTone[insight.status],
              )}
            >
              {STATUS_LABELS[insight.status]}
            </span>
          </div>

          {insight.impact !== null ? (
            <p className={cn('tnum text-metric font-semibold tracking-tight', tone.text)}>
              {fmt.currency(insight.impact)}
            </p>
          ) : null}

          <p className="text-body leading-relaxed text-ink-muted">
            {insight.description}
          </p>
        </section>

        <section className="space-y-2">
          <SectionTitle>Why it matters</SectionTitle>
          <p className="text-body leading-relaxed text-ink-muted">{insight.reason}</p>
        </section>

        <section className="space-y-2">
          <SectionTitle>Recommended action</SectionTitle>
          <p className="rounded-field border border-line bg-elevated p-3 text-body leading-relaxed text-ink">
            {insight.recommendation}
          </p>
          {insight.action ? (
            <Link
              to={insight.action.to}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-field border border-line bg-elevated px-3 py-2 text-xs text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              {insight.action.label}
              <ArrowRight className="size-3" />
            </Link>
          ) : null}
        </section>

        {insight.evidence.length > 0 ? (
          <section className="space-y-2">
            <SectionTitle>Data behind it</SectionTitle>
            <dl className="divide-y divide-line-soft rounded-field border border-line">
              {insight.evidence.map((entry) => (
                <div
                  key={`${entry.label}-${entry.value}`}
                  className="flex items-baseline justify-between gap-4 px-3 py-2 text-body"
                >
                  <dt className="shrink-0 text-ink-subtle">{entry.label}</dt>
                  <dd className="tnum min-w-0 truncate text-right text-ink">
                    {entry.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="space-y-2">
          <SectionTitle>Why am I seeing this?</SectionTitle>
          <div className="rounded-field border border-line bg-elevated p-3">
            <p className="text-xs text-ink-subtle">This insight was triggered because:</p>
            <ul className="mt-2 space-y-1.5">
              {insight.triggers.map((trigger) => (
                <li
                  key={trigger}
                  className="flex items-start gap-2 text-body leading-relaxed text-ink-muted"
                >
                  <span
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint"
                    aria-hidden
                  />
                  {trigger}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-1">
          <SectionTitle>Details</SectionTitle>
          <dl className="divide-y divide-line-soft">
            <div className="flex items-baseline justify-between gap-4 py-2 text-body">
              <dt className="text-ink-subtle">Affected</dt>
              <dd className="text-ink">{insight.entityName ?? 'Company-wide'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2 text-body">
              <dt className="text-ink-subtle">Priority score</dt>
              <dd className="tnum text-ink">
                {insight.priorityScore}/100 · {SEVERITY_LABELS[insight.severity]}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2 text-body">
              <dt className="text-ink-subtle">Signal dated</dt>
              <dd className="text-ink">{fmt.date(insight.createdAt)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </Drawer>
  )
}
