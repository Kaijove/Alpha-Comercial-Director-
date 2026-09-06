import { STAGE_LABELS } from '@/domain/commerce'
import { HEALTH_BAND_LABELS } from '@/domain/intelligence/opportunityScoring'
import { CATEGORY_LABELS } from '@/domain/intelligence/types'
import type { ReportDocument } from '@/domain/reports/types'
import { useFormatters } from '@/hooks/useFormatters'

/**
 * The document itself.
 *
 * A white, A4-proportioned page with its own typography and its own palette -
 * not the dashboard reproduced inside a PDF. What renders here is exactly what
 * prints: the same markup, the same stylesheet, one definition of the document.
 *
 * Every figure is read from the `ReportDocument` the engine assembled. Nothing
 * on this page calculates anything.
 */
export function ReportDocumentView({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { meta, sections } = document
  const has = (key: (typeof sections)[number]) => sections.includes(key)

  return (
    <article className="report-doc" aria-label="Report preview">
      <Masthead document={document} />

      {has('summary') ? <SummarySection document={document} /> : null}
      {has('kpis') ? <KpiSection document={document} /> : null}
      {has('revenue') ? <RevenueSection document={document} /> : null}
      {has('funnel') ? <FunnelSection document={document} /> : null}
      {has('pipeline') ? <PipelineSection document={document} /> : null}
      {has('team') ? <TeamSection document={document} /> : null}
      {has('forecast') ? <ForecastSection document={document} /> : null}
      {has('intelligence') ? <IntelligenceSection document={document} /> : null}
      {has('customers') ? <CustomerSection document={document} /> : null}
      {has('highlights') ? <HighlightsSection document={document} /> : null}

      {document.gaps.length > 0 ? (
        <section className="doc-section">
          <div className="doc-section-title">
            <h2>Data notes</h2>
          </div>
          <ul className="doc-list">
            {document.gaps.map((gap) => (
              <li key={gap.section} className="doc-muted" style={{ fontSize: '9pt' }}>
                {gap.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="doc-footer">
        <span>
          {meta.companyName} · {document.typeLabel} · {meta.periodTitle}
        </span>
        <span>
          {meta.currency} · Generated {fmt.date(meta.generatedAt)} by Commercial Command Center
        </span>
      </footer>
    </article>
  )
}

// ---------------------------------------------------------------------------

function Masthead({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { meta } = document

  return (
    <header className="doc-masthead">
      <div>
        <p className="doc-eyebrow">{meta.companyName}</p>
        <h1 style={{ marginTop: '2mm' }}>{document.typeLabel}</h1>
        <p className="doc-muted" style={{ marginTop: '2mm', fontSize: '10pt' }}>
          {meta.periodTitle}
          {meta.ownerName ? ` · ${meta.ownerName}` : ''}
          {meta.isComplete ? ' · Final' : ' · In progress'}
        </p>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {meta.logo ? (
          <img src={meta.logo} alt="" className="doc-logo" style={{ marginLeft: 'auto' }} />
        ) : null}
        <p className="doc-faint" style={{ marginTop: meta.logo ? '3mm' : 0, fontSize: '8pt' }}>
          Prepared for
        </p>
        <p style={{ fontSize: '9.5pt', fontWeight: 500 }}>{meta.directorName || '—'}</p>
        {meta.directorTitle ? (
          <p className="doc-faint" style={{ fontSize: '8pt' }}>{meta.directorTitle}</p>
        ) : null}
        <p className="doc-faint" style={{ marginTop: '2mm', fontSize: '8pt' }}>
          {fmt.date(meta.generatedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </header>
  )
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="doc-section-title">
      <h2>{title}</h2>
      {note ? (
        <span className="doc-faint" style={{ fontSize: '8pt' }}>
          {note}
        </span>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------

function SummarySection({ document }: { document: ReportDocument }) {
  return (
    <section className="doc-section">
      <SectionTitle title="Executive Summary" />
      <div className="doc-lede doc-muted" style={{ fontSize: '10pt' }}>
        {document.summary.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  )
}

function KpiSection({ document }: { document: ReportDocument }) {
  return (
    <section className="doc-section">
      <SectionTitle
        title="Key Performance Indicators"
        note="Against the equivalent window of the previous period"
      />
      <div className="doc-kpis">
        {document.kpis.map((kpi) => (
          <div key={kpi.key} className="doc-kpi">
            <p className="doc-kpi-label">{kpi.label}</p>
            <p className="doc-kpi-value">{kpi.value}</p>
            <p className="doc-kpi-meta">
              {kpi.change ? (
                <span className={kpi.direction === 'up' ? 'doc-up' : kpi.direction === 'down' ? 'doc-down' : ''}>
                  {kpi.change}
                </span>
              ) : null}
              {kpi.change && kpi.changePercent ? ' · ' : ''}
              {kpi.changePercent ? <span>{kpi.changePercent}</span> : null}
              {!kpi.change && !kpi.changePercent && kpi.previous ? (
                <span className="doc-faint">was {kpi.previous}</span>
              ) : null}
              {!kpi.change && !kpi.changePercent && !kpi.previous ? (
                <span className="doc-faint">—</span>
              ) : null}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function RevenueSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { revenueSeries, metrics } = document
  const peak = Math.max(...revenueSeries.map((point) => point.cumulative), metrics.target, 1)

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle
        title="Revenue Performance"
        note={`Cumulative against a ${fmt.currency(metrics.target)} commitment`}
      />

      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Revenue</th>
            <th>Cumulative</th>
            <th>Target to date</th>
            <th style={{ width: '34%' }}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {revenueSeries.map((point) => (
            <tr key={point.label}>
              <td className="doc-cell-name">{point.label}</td>
              <td>{fmt.currency(point.revenue)}</td>
              <td>{fmt.currency(point.cumulative)}</td>
              <td className="doc-faint">{fmt.currency(point.target)}</td>
              <td>
                <div className="doc-bar" style={{ marginTop: '1mm' }}>
                  <span
                    className={point.cumulative >= point.target ? 'is-positive' : ''}
                    style={{ width: `${Math.min(100, (point.cumulative / peak) * 100)}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="doc-muted" style={{ marginTop: '3mm', fontSize: '9pt' }}>
        {metrics.revenueDelta !== null
          ? `Revenue is ${metrics.revenueDelta >= 0 ? 'up' : 'down'} ${fmt.percent(Math.abs(metrics.revenueDelta), 1)} against ${fmt.currency(metrics.previousRevenue)} in the equivalent window of the previous period.`
          : 'There is no comparable revenue in the previous period.'}
      </p>
    </section>
  )
}

function FunnelSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { funnel, conversions } = document
  const entry = funnel[0]?.entered ?? 0

  return (
    <section className="doc-section">
      <SectionTitle
        title="Sales Funnel"
        note={`Cohort of ${entry} ${entry === 1 ? 'opportunity' : 'opportunities'} that entered in this period`}
      />

      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Opportunities</th>
            <th>Value</th>
            <th>Conversion from previous</th>
            <th style={{ width: '26%' }}>Share of cohort</th>
          </tr>
        </thead>
        <tbody>
          {funnel.map((stage) => (
            <tr key={stage.stage}>
              <td className="doc-cell-name">{STAGE_LABELS[stage.stage]}</td>
              <td>{stage.entered}</td>
              <td>{fmt.currency(stage.value)}</td>
              <td>
                {stage.conversionFromPrevious !== null
                  ? fmt.percent(stage.conversionFromPrevious, 0)
                  : '—'}
              </td>
              <td>
                <div className="doc-bar" style={{ marginTop: '1mm' }}>
                  <span style={{ width: `${entry > 0 ? (stage.entered / entry) * 100 : 0}%` }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {conversions.length > 0 ? (
        <p className="doc-muted" style={{ marginTop: '3mm', fontSize: '9pt' }}>
          {conversions
            .filter((conversion) => conversion.changePoints !== null)
            .map(
              (conversion) =>
                `${STAGE_LABELS[conversion.from]} → ${STAGE_LABELS[conversion.to]} ${conversion.changePoints! >= 0 ? 'up' : 'down'} ${fmt.number(Math.abs(conversion.changePoints!) * 100, 1)} points`,
            )
            .join(' · ') || 'No comparable cohort in the previous period.'}
        </p>
      ) : null}
    </section>
  )
}

function PipelineSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { metrics, forecast, scored } = document

  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, 10)
  const averageValue =
    metrics.openCount > 0 ? metrics.pipelineTotal / metrics.openCount : null

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Pipeline Overview" />

      <div className="doc-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <Figure label="Open pipeline" value={fmt.currency(metrics.pipelineTotal)} meta={`${metrics.openCount} opportunities`} />
        <Figure label="Weighted pipeline" value={fmt.currency(metrics.weightedPipeline)} meta="Value × probability" />
        <Figure
          label="Coverage"
          value={metrics.coverage !== null ? `${fmt.number(metrics.coverage, 1)}x` : 'Covered'}
          meta={`Against ${fmt.currency(metrics.remainingToTarget)} remaining`}
        />
        <Figure
          label="Closing in period"
          value={fmt.currency(metrics.closingInPeriodValue)}
          meta={`${metrics.closingInPeriod.length} opportunities`}
        />
        <Figure
          label="Average opportunity"
          value={averageValue !== null ? fmt.currency(averageValue) : '—'}
          meta="Face value"
        />
        <Figure
          label="Forecast contribution"
          value={fmt.currency(forecast.expectedFromPipeline)}
          meta="After health and timing"
        />
      </div>

      <h3 style={{ marginTop: '6mm', marginBottom: '2mm' }}>Pipeline by stage</h3>
      <table>
        <thead>
          <tr>
            <th>Stage</th>
            <th>Opportunities</th>
            <th>Value</th>
            <th>Weighted</th>
            <th style={{ width: '26%' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {metrics.stages.map((stage) => (
            <tr key={stage.stage}>
              <td className="doc-cell-name">{STAGE_LABELS[stage.stage]}</td>
              <td>{stage.count}</td>
              <td>{fmt.currency(stage.value)}</td>
              <td className="doc-faint">{fmt.currency(stage.weighted)}</td>
              <td>
                <div className="doc-bar" style={{ marginTop: '1mm' }}>
                  <span
                    style={{
                      width: `${metrics.pipelineTotal > 0 ? (stage.value / metrics.pipelineTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {top.length > 0 ? (
        <>
          <h3 style={{ marginTop: '6mm', marginBottom: '2mm' }}>Top opportunities</h3>
          <table>
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Owner</th>
                <th>Stage</th>
                <th>Value</th>
                <th>Prob.</th>
                <th>Close</th>
                <th>Health</th>
                <th>In forecast</th>
              </tr>
            </thead>
            <tbody>
              {top.map((entry) => {
                const contribution = forecast.contributions.find(
                  (item) => item.opportunity.id === entry.opportunity.id,
                )
                return (
                  <tr key={entry.opportunity.id}>
                    <td>
                      <span className="doc-cell-name">{entry.opportunity.name}</span>
                      <span className="doc-cell-sub">
                        {document.customers.find(
                          (customer) => customer.customer.id === entry.opportunity.customerId,
                        )?.customer.name ?? '—'}
                      </span>
                    </td>
                    <td className="doc-faint">
                      {document.reps.find((rep) => rep.owner.id === entry.opportunity.ownerId)
                        ?.owner.name ?? '—'}
                    </td>
                    <td className="doc-faint">{STAGE_LABELS[entry.opportunity.stage]}</td>
                    <td>{fmt.currency(entry.opportunity.value)}</td>
                    <td>{fmt.percent(entry.opportunity.probability, 0)}</td>
                    <td className="doc-faint">
                      {fmt.shortDate(entry.opportunity.expectedCloseDate)}
                    </td>
                    <td
                      className={
                        entry.health.band === 'healthy'
                          ? 'doc-up'
                          : entry.health.band === 'critical'
                            ? 'doc-down'
                            : entry.health.band === 'at-risk'
                              ? 'doc-warn'
                              : ''
                      }
                    >
                      {HEALTH_BAND_LABELS[entry.health.band]}
                    </td>
                    <td>{contribution ? fmt.currency(contribution.contribution) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  )
}

function TeamSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Sales Team Performance" note="Each rep against their own target" />

      <table>
        <thead>
          <tr>
            <th>Representative</th>
            <th>Revenue</th>
            <th>Target</th>
            <th>Attainment</th>
            <th>Pipeline</th>
            <th>Weighted</th>
            <th>Win rate</th>
            <th>Avg. deal</th>
            <th>Forecast</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {document.reps.map((rep) => {
            const forecast = document.forecast.reps.find(
              (entry) => entry.ownerId === rep.owner.id,
            )
            return (
              <tr key={rep.owner.id}>
                <td>
                  <span className="doc-cell-name">{rep.owner.name}</span>
                  <span className="doc-cell-sub">{rep.owner.role}</span>
                </td>
                <td>{fmt.currency(rep.revenue)}</td>
                <td className="doc-faint">{fmt.currency(rep.target)}</td>
                <td>{rep.attainment !== null ? fmt.percent(rep.attainment, 0) : '—'}</td>
                <td>{fmt.currency(rep.pipeline)}</td>
                <td className="doc-faint">{fmt.currency(rep.weightedPipeline)}</td>
                <td>{rep.winRate !== null ? fmt.percent(rep.winRate, 0) : '—'}</td>
                <td>{rep.averageDealSize !== null ? fmt.currency(rep.averageDealSize) : '—'}</td>
                <td>{forecast ? fmt.currency(forecast.forecast) : '—'}</td>
                <td
                  className={
                    forecast?.state === 'above-target'
                      ? 'doc-up'
                      : forecast?.state === 'critical'
                        ? 'doc-down'
                        : forecast?.state === 'at-risk'
                          ? 'doc-warn'
                          : ''
                  }
                >
                  {forecast ? STATE_LABELS[forecast.state] : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

const STATE_LABELS = {
  'above-target': 'Above target',
  'on-track': 'On track',
  'at-risk': 'At risk',
  critical: 'Critical',
} as const

function ForecastSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { forecast, metrics } = document

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Forecast Outlook" note={forecast.confidence.label} />

      <div className="doc-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
        <Figure label="Current revenue" value={fmt.currency(metrics.revenue)} meta="Already closed" />
        <Figure label="Target" value={fmt.currency(metrics.target)} meta={document.meta.periodTitle} />
        <Figure label="Worst case" value={fmt.currency(forecast.scenarios.worst.value)} meta={scenarioMeta(forecast.scenarios.worst.gap, fmt.currency)} />
        <Figure label="Base case" value={fmt.currency(forecast.scenarios.base.value)} meta={scenarioMeta(forecast.scenarios.base.gap, fmt.currency)} />
        <Figure label="Best case" value={fmt.currency(forecast.scenarios.best.value)} meta={scenarioMeta(forecast.scenarios.best.gap, fmt.currency)} />
        <Figure
          label="Forecast gap"
          value={`${forecast.gap >= 0 ? '+' : '−'}${fmt.currency(Math.abs(forecast.gap))}`}
          meta={forecast.gapDetail.label}
        />
        <Figure label="Probability of target" value={`${forecast.probability.score}%`} meta="Deterministic score" />
        <Figure label="Forecast confidence" value={`${forecast.confidence.score}/100`} meta={forecast.confidence.label} />
      </div>

      <p className="doc-muted" style={{ marginTop: '4mm', fontSize: '9pt' }}>
        {forecast.confidence.summary}
      </p>

      <h3 style={{ marginTop: '6mm', marginBottom: '2mm' }}>Path to target</h3>
      <p className="doc-muted" style={{ fontSize: '9pt' }}>
        {forecast.path.required > 0
          ? `${fmt.currency(forecast.path.required)} of additional revenue is required. ${forecast.path.summary}`
          : forecast.path.summary}
      </p>

      {forecast.path.deals.length > 0 ? (
        <table style={{ marginTop: '3mm' }}>
          <thead>
            <tr>
              <th>Opportunity</th>
              <th>Value</th>
              <th>Prob.</th>
              <th>Close</th>
              <th>Health</th>
              <th>In forecast</th>
            </tr>
          </thead>
          <tbody>
            {forecast.path.deals.map((entry) => (
              <tr key={entry.opportunity.id}>
                <td className="doc-cell-name">{entry.opportunity.name}</td>
                <td>{fmt.currency(entry.value)}</td>
                <td>{fmt.percent(entry.probability, 0)}</td>
                <td className="doc-faint">{fmt.shortDate(entry.opportunity.expectedCloseDate)}</td>
                <td>{HEALTH_BAND_LABELS[entry.health.band]}</td>
                <td>{fmt.currency(entry.contribution)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <p className="doc-faint" style={{ marginTop: '3mm', fontSize: '8pt' }}>
        {forecast.methodology}
      </p>
    </section>
  )
}

const scenarioMeta = (gap: number, currency: (value: number) => string): string =>
  gap >= 0 ? `${currency(gap)} above target` : `${currency(Math.abs(gap))} below target`

function IntelligenceSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const { health, insights, forecast } = document

  const live = insights.filter(
    (insight) => insight.status !== 'dismissed' && insight.status !== 'resolved',
  )
  const critical = live.filter((insight) => insight.severity === 'critical')
  const high = live.filter((insight) => insight.severity === 'high')
  const positive = live.filter((insight) => insight.severity === 'positive')
  const anomalies = live.filter((insight) => insight.category === 'anomaly')
  const stalled = forecast.contributions.filter((entry) => entry.health.inactiveDays >= 12)

  const ranked = live
    .filter((insight) => insight.severity !== 'positive' && insight.severity !== 'low')
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8)

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Commercial Intelligence" note={`Health ${health.score}/100 · ${health.label}`} />

      <div className="doc-tint">
        <p style={{ fontSize: '9.5pt' }}>{health.summary}</p>
      </div>

      <div className="doc-kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', marginTop: '4mm' }}>
        <Figure label="Critical issues" value={`${critical.length}`} meta="Top severity" />
        <Figure label="High priority" value={`${high.length}`} meta="Worth acting on" />
        <Figure label="Revenue at risk" value={fmt.currency(forecast.risk.total)} meta={`${forecast.risk.entries.length} opportunities`} />
        <Figure label="Stalled in forecast" value={`${stalled.length}`} meta="No activity for 12+ days" />
        <Figure label="Anomalies" value={`${anomalies.length}`} meta="Against the trailing baseline" />
        <Figure
          label="Pipeline coverage"
          value={document.metrics.coverage !== null ? `${fmt.number(document.metrics.coverage, 1)}x` : 'Covered'}
          meta="Open pipeline over remaining target"
        />
        <Figure label="Positive signals" value={`${positive.length}`} meta="Worth protecting" />
        <Figure label="Data quality" value={`${forecast.quality.score}%`} meta="Fields the model reads" />
      </div>

      {ranked.length > 0 ? (
        <>
          <h3 style={{ marginTop: '6mm', marginBottom: '2mm' }}>Recommended actions</h3>
          <table>
            <thead>
              <tr>
                <th>Signal</th>
                <th>Category</th>
                <th>Impact</th>
                <th>Priority</th>
                <th style={{ width: '32%' }}>Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((insight) => (
                <tr key={insight.id}>
                  <td>
                    <span className="doc-cell-name">{insight.title}</span>
                    <span className="doc-cell-sub">{insight.reason}</span>
                  </td>
                  <td className="doc-faint">{CATEGORY_LABELS[insight.category]}</td>
                  <td>{insight.impact !== null ? fmt.currency(insight.impact) : '—'}</td>
                  <td
                    className={
                      insight.severity === 'critical'
                        ? 'doc-down'
                        : insight.severity === 'high'
                          ? 'doc-warn'
                          : ''
                    }
                  >
                    {insight.priorityScore}
                  </td>
                  <td style={{ textAlign: 'left' }}>{insight.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="doc-muted" style={{ marginTop: '4mm', fontSize: '9pt' }}>
          No signal above the medium severity band is outstanding for this period.
        </p>
      )}
    </section>
  )
}

function CustomerSection({ document }: { document: ReportDocument }) {
  const fmt = useFormatters()
  const top = [...document.customers]
    .filter((customer) => customer.revenue > 0 || customer.openPipeline > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  const totalRevenue = document.metrics.revenue

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Customer Analysis" note="Ranked by revenue booked in the period" />
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Revenue</th>
            <th>Share</th>
            <th>Won deals</th>
            <th>Avg. deal</th>
            <th>Open pipeline</th>
          </tr>
        </thead>
        <tbody>
          {top.map((customer) => (
            <tr key={customer.customer.id}>
              <td>
                <span className="doc-cell-name">{customer.customer.name}</span>
                <span className="doc-cell-sub">{customer.customer.industry}</span>
              </td>
              <td>{fmt.currency(customer.revenue)}</td>
              <td>{totalRevenue > 0 ? fmt.percent(customer.revenue / totalRevenue, 0) : '—'}</td>
              <td>{customer.wonDeals}</td>
              <td className="doc-faint">
                {customer.averageDealSize !== null ? fmt.currency(customer.averageDealSize) : '—'}
              </td>
              <td>{fmt.currency(customer.openPipeline)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function HighlightsSection({ document }: { document: ReportDocument }) {
  const { highlights } = document

  return (
    <section className="doc-section doc-section-large">
      <SectionTitle title="Management Highlights" />
      <div className="doc-columns">
        <HighlightList title="Positive" items={highlights.positive} tone="doc-up" />
        <HighlightList title="Attention" items={highlights.attention} tone="doc-warn" />
        <HighlightList title="Recommended actions" items={highlights.actions} tone="" />
      </div>
    </section>
  )
}

function HighlightList({
  title,
  items,
  tone,
}: {
  title: string
  items: ReportDocument['highlights']['positive']
  tone: string
}) {
  return (
    <div>
      <h3 className={tone} style={{ marginBottom: '2mm' }}>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="doc-faint" style={{ fontSize: '8.5pt' }}>
          Nothing to report.
        </p>
      ) : (
        <ul className="doc-list">
          {items.map((item, index) => (
            <li key={`${index}-${item.text}`}>
              <p style={{ fontSize: '9pt' }}>{item.text}</p>
              {item.detail ? (
                <p className="doc-faint" style={{ fontSize: '8pt', marginTop: '0.8mm' }}>
                  {item.detail}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Figure({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="doc-kpi">
      <p className="doc-kpi-label">{label}</p>
      <p className="doc-kpi-value">{value}</p>
      {meta ? <p className="doc-kpi-meta doc-faint">{meta}</p> : null}
    </div>
  )
}
