# Commercial Command Center

The daily control room for a sales director: targets, team, pipeline, forecast and the
opportunities that need attention — in one dark, quiet, data-forward workspace.

**Phase 0** shipped the foundation: design system, routing, onboarding, persistence and
the settings architecture.

**Phase 1** shipped the Executive Dashboard: a simulated but coherent commercial dataset,
one shared metrics layer, a Commercial Health service, a deterministic Today's Focus engine,
and the executive views on top of them.

**Phase 2** shipped Analytics & Commercial Performance: trailing analysis windows, a cohort
sales funnel derived from recorded stage history, stage-to-stage conversion, sales cycle,
revenue distribution, sortable rep and customer tables, and a deterministic insights engine.

**Phase 3** shipped Sales Pipeline & Opportunity Management: a Kanban board with
drag-and-drop stage changes, a sortable table view, full opportunity CRUD, a risk engine, and
the persistence layer that makes all of it durable.

**Phase 4 (current)** ships Sales Team & Performance Management: per-rep quotas, a
performance engine, a coaching engine, team benchmarks, and roster management that never
loses a deal.

## Running it

```bash
npm install
npm run dev
```

| Script            | What it does                                |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Vite dev server on http://localhost:5173    |
| `npm run build`   | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the production build                  |
| `npm run typecheck` | TypeScript only, no emit                  |
| `npm test`        | Vitest run over the domain engines          |
| `npm run validate`| Typecheck, tests and production build in one |

## Stack

React 18 · Vite 6 · TypeScript (strict) · Tailwind CSS v4 (CSS-first tokens) ·
React Router 7 · lucide-react · Recharts · localStorage for persistence.
No backend, no AI API, no paid services.

## Project structure

```
src/
├── app/
│   ├── ErrorBoundary.tsx           Recoverable failure screen
│   ├── router.tsx                  Routes + onboarding guards
│   └── providers/
│       ├── workspaceContext.ts        Context + useWorkspace / useReadyWorkspace
│       ├── WorkspaceProvider.tsx      State, persistence, cross-tab sync
│       ├── commercialDataContext.ts   Context + useCommercialData
│       ├── CommercialDataProvider.tsx Memoised dataset + id lookups
│       ├── insightStatusContext.ts    Context + useInsightStatus
│       └── InsightStatusProvider.tsx  Seen / resolved / dismissed, persisted
│
├── domain/                            Business model and logic, framework-free
│   ├── workspace.ts                   Workspace types + helpers
│   ├── commerce.ts                    Opportunity, Customer, Activity, Owner, stages
│   ├── defaults.ts / validation.ts    Onboarding draft + per-step validators
│   ├── metrics/                       THE ONE SOURCE OF TRUTH for every figure
│   │   ├── periods.ts                 MTD / QTD / YTD windows + period targets
│   │   ├── primitives.ts              Revenue, pipeline, weighted, win rate, coverage
│   │   ├── forecast.ts                Baseline forecast
│   │   ├── series.ts                  Chart time series (7D / 30D / 90D / YTD)
│   │   ├── teamMetrics.ts             The same primitives, per rep
│   │   ├── curve.ts                   The one piecewise scoring curve
│   │   └── dashboardMetrics.ts        One snapshot for the executive views
│   ├── health/commercialHealth.ts     Weighted, explainable health score
│   ├── forecast/                      THE FORECAST ENGINE
│   │   ├── forecastConfig.ts          Every number the model assumes
│   │   ├── forecastCalculator.ts      Per-deal contribution
│   │   ├── forecastScenarioEngine.ts  Worst / base / best
│   │   ├── forecastConfidenceEngine.ts How much the number can carry
│   │   ├── targetProjectionEngine.ts  Probability, gap, path to target
│   │   ├── forecastTimeline.ts        When the revenue is expected
│   │   ├── forecastSensitivity.ts     Sensitivity table + simulator
│   │   ├── forecastDataQuality.ts     What the model had to work with
│   │   ├── forecastSeries.ts          Actual-then-projected chart series
│   │   ├── forecastAccuracy.ts        Snapshot scoring, when available
│   │   └── forecastEngine.ts          The single orchestrator
│   └── reports/                       THE REPORT ENGINE
│       ├── reportPeriods.ts           This / last month, quarter, year, custom
│       ├── summaryGenerator.ts        The executive summary, clause by clause
│       ├── highlightsEngine.ts        Positive / attention / recommended
│       ├── csvExport.ts               CSV serialisation, RFC 4180
│       ├── reportNaming.ts            Safe, professional filenames
│       ├── reportValidation.ts        What must be true before exporting
│       └── reportEngine.ts            The single orchestrator
│   ├── risk/riskEngine.ts             Per-deal risk signal for the Pipeline
│   ├── team/                          Rep performance + coaching signals
│   ├── insights/analyticsEngine.ts    Deterministic Analytics observations
│   └── intelligence/                  THE INTELLIGENCE ENGINE
│       ├── thresholds.ts              Every commercial threshold, in one place
│       ├── opportunityScoring.ts      Per-deal health and priority
│       ├── priorityEngine.ts          Impact / urgency / confidence / relevance
│       ├── riskRules.ts               Revenue at risk, gaps, stalled, concentration
│       ├── anomalyEngine.ts           Trailing baseline + deviation rules
│       ├── teamRules.ts               Coaching signals as insights
│       ├── positiveRules.ts           What is working, not only what is broken
│       ├── intelligenceEngine.ts      The single orchestrator
│       └── __tests__/                 Vitest over the engines
│
├── data/
│   ├── catalogs.ts                    Countries, currencies, sectors, roles
│   ├── seed/                          Deterministic commercial data generator
│   │   ├── rng.ts                     Seeded PRNG, deal-value rounding
│   │   ├── dictionaries.ts            Company names, industries, products per sector
│   │   └── generateCommercialData.ts  History, pipeline, activities
│   └── repository/                    THE SWAP POINT for a future CRM / API
│
├── lib/                               storage, format, dates, cn, id
├── hooks/useFormatters.ts             The single formatting surface for the UI
│
├── components/
│   ├── ui/                            Design-system primitives
│   ├── charts/                        Recharts theme + shared tooltip
│   ├── composite/                     TeamEditor, LogoUploader, KpiCard, DeltaBadge
│   └── layout/                        AppShell, Sidebar, Topbar, BrandMark, navigation
│
├── features/
│   ├── onboarding/                    6-step wizard + completion hand-off
│   ├── dashboard/                     DashboardPage, useDashboardData, components/
│   ├── analytics/                     Trailing windows, funnel, conversion, tables
│   ├── pipeline/                      Kanban + table, opportunity CRUD
│   ├── team/                          Roster, quotas, benchmarks, coaching
│   ├── intelligence/                  IntelligencePage, useIntelligence, components/
│   ├── forecast/                      ForecastPage, useForecast, components/
│   ├── reports/                       ReportsPage, useReports, components/
│   ├── settings/                      SettingsLayout + 6 sections
│   └── placeholder/                   NotFoundPage
│
└── styles/index.css                   Design tokens, keyframes, base layer, utilities
```

## Routing

| Route                    | Screen                                            |
| ------------------------ | ------------------------------------------------- |
| `/onboarding`            | Setup wizard (redirects away once completed)      |
| `/dashboard`             | Executive Command Center                          |
| `/analytics`             | Analytics & commercial performance                |
| `/pipeline`              | Sales pipeline & opportunity management           |
| `/team`                  | Sales team & performance management               |
| `/intelligence`          | Commercial intelligence & alerts                  |
| `/forecast`              | Advanced commercial forecast                      |
| `/reports`               | Executive reports & export                        |
| `/settings/profile`      | Director profile                                  |
| `/settings/company`      | Company, sector, country, logo                    |
| `/settings/goals`        | Monthly / annual targets, reporting currency      |
| `/settings/team`         | Sales roster                                      |
| `/settings/preferences`  | Locale, fiscal year, week start, compact numbers  |
| `/settings/data`         | Storage info, export, reset                       |

Two guards enforce the flow: `RequireWorkspace` bounces an unconfigured visitor to
`/onboarding`, and `RedirectIfOnboarded` keeps a configured director out of setup.

## How persistence works

Everything goes through `src/lib/storage.ts`, which namespaces keys under `ccc:` and falls
back to an in-memory map when the browser blocks storage (private mode, full quota). Six
keys are used:

- **`ccc:workspace`** — the completed workspace. Written on every save, read once at boot.
- **`ccc:onboarding-draft`** — autosaved on every keystroke during setup, deleted the moment
  the workspace is created. Closing the tab mid-setup resumes exactly where you left off.
- **`ccc:commercial-dataset`** — the generated dataset, owned from first render onward.
- **`ccc:insight-status`** — seen / resolved / dismissed, keyed by insight id.
- **`ccc:forecast-snapshots`** — what the forecast said, at the moment it was saved.
- **`ccc:report-history`** — report configurations, never rendered documents.

The last four hold *decisions and derived state*, never commercial records. Dismissing an
insight, saving a forecast snapshot or generating a report cannot touch an opportunity, a
customer or a rep.

On boot, `migrateWorkspace` normalises whatever comes back from disk: missing fields get
defaults, wrong types are coerced, unnamed reps are dropped, and `schemaVersion` gives
future releases a migration hook. A corrupted entry logs a warning and is ignored rather
than crashing the app.

The provider also listens to the `storage` event, so two open tabs stay in sync.

### Swapping in a real backend

`src/data/repository/index.ts` is the only place that names a concrete implementation:

```ts
export const workspaceRepository = localWorkspaceRepository
export const draftRepository = localDraftRepository
```

Write an `apiWorkspaceRepository` that satisfies `WorkspaceRepository`, change those two
lines, and no feature code has to move. The interfaces are already shaped for async work
(the provider carries a `status: 'loading' | 'ready'` field that today is always `ready`).

## Design system

Dark-first, defined entirely as Tailwind v4 `@theme` tokens in `src/styles/index.css`.

### Type scale

Nine steps, each with a job, so a size is chosen by asking what the text *is* rather than by
picking a pixel value:

| Step | Size | Used for |
| --- | --- | --- |
| `text-2xs` | 11px | Micro labels, uppercase eyebrows, table headers |
| `text-xs` | 12px | Metadata, captions, helper text |
| `text-body` | 13px | The default: UI text, table cells, list items |
| `text-sm` | 14px | Emphasised body, panel descriptions |
| `text-title` | 15px | Panel and card titles |
| `text-section` | 17px | Headings inside a page |
| `text-page` | 26px | Page titles |
| `text-metric` | 26px | KPI figures |
| `text-metric-lg` | 32px | Large figures |
| `text-display` | 40px | The onboarding hero |

Before the productization pass the application used **seventeen distinct arbitrary pixel
sizes** across its pages (`text-[13px]` alone appeared 130 times), which is what made screens
built weeks apart feel like different products. There are now zero arbitrary sizes in the
source.

### Page rhythm

Every page is `animate-rise space-y-7` with a single `<h1>` at `text-page`. Three different
rhythms and two different title sizes were in use before; two pages had no entry transition at
all.

### Touch targets

The interface is dense on purpose - a director scanning a pipeline wants rows, not padding -
so the minimum 40px target is applied under `@media (pointer: coarse)` only. A tablet gets a
comfortable hit area; a narrow desktop window stays exactly as dense as it was, because a
narrow window is still a mouse.

### Tokens

- **Surfaces** `canvas` → `surface` → `elevated` → `raised`, four steps of near-black
- **Lines** `line-soft` / `line` / `line-strong` for seams instead of heavy borders
- **Ink** `ink` / `ink-muted` / `ink-subtle` / `ink-faint`, a four-step text hierarchy
- **One accent** (`accent`, a restrained cobalt) plus semantic `positive` / `warning` /
  `negative`, used only where they carry meaning
- **Radii** `field` (10px), `panel` (16px), `sheet` (22px)
- **Motion** one easing curve (`ease-out-soft`) and short named animations —
  `rise`, `fade-in`, `scale-in`, `step-forward`, `step-back`, `draw`, `halo`

Figures use the `tnum` utility (tabular numerals) so columns of numbers never jitter.
Everything honours `prefers-reduced-motion`.

## Commercial data

The dataset is **generated, not hard-coded, and fully deterministic**: one seed derived from
the company name and workspace creation date drives a `mulberry32` generator, so the same
workspace always produces the same customers, deals and activities. Nothing calls
`Math.random` for business data, and nothing changes between renders.

```
src/data/seed/
├── rng.ts                    Seeded PRNG + deal-value rounding
├── dictionaries.ts           Company names, industries, regions, products per sector
└── generateCommercialData.ts The generator itself
```

Volumes are scaled from the director's own monthly target, so the figures stay coherent with
what was entered during onboarding. The generator produces 14 months of closed history plus
an open pipeline of roughly 3.8x the monthly target, with expected close dates drawn first
and stages derived from them (a deal closing next week is probably in Negotiation; one
closing in four months is probably a Lead).

Relations use ids only — `opportunity.customerId`, `opportunity.ownerId`,
`activity.opportunityId` — so a rename in one place propagates everywhere. Sales reps come
straight from the workspace roster; a director who skipped the team step gets a single
implicit owner.

`CommercialDataProvider` memoises the dataset and exposes id lookups. It is also the seam
where a persisted overlay of user edits, and later a real CRM, will be layered in.

## How the metrics are calculated

Every figure in the product comes from one module, so no two screens can disagree:

```
src/domain/metrics/
├── periods.ts          Calendar "to date" windows + the target for each
├── primitives.ts       The definitions: revenue, pipeline, weighted, win rate, ...
├── curve.ts            The one piecewise 0-100 scoring curve
├── series.ts           Chart time series
├── teamMetrics.ts      The same primitives, per rep
└── dashboardMetrics.ts One snapshot combining all of the above
```

| Metric | Definition |
| --- | --- |
| Revenue | Value of deals **won** with a close date inside the period |
| Target | Monthly target (MTD), monthly x3 (QTD), annual target (YTD) |
| Attainment | `revenue / target` |
| Pace | `revenue / (target x share of period elapsed)` |
| Pipeline | Face value of every **open** opportunity |
| Weighted pipeline | `sum(value x probability)` |
| Forecast | `revenue + sum(value x probability x health x timing)` over open deals due before the period ends. Produced by the [forecast engine](#advanced-commercial-forecast), not defined here. |
| Win rate | `won / (won + lost)` over deals closed in the period |
| Avg. deal size | `revenue / number of won deals` |
| Pipeline coverage | `open pipeline / remaining target` — face value, since the ~3x benchmark already accounts for conversion |

Periods are calendar-anchored ("this month to date"), never trailing windows, which is what
gives target progress a real end date, a real number of days left and a real run rate. The
revenue chart keeps its own 7D/30D/90D/YTD range: that is a display choice about the shape
of the curve, and it never feeds a KPI.

## Commercial Health

`src/domain/health/commercialHealth.ts` scores independent signals and combines them —
it deliberately does not dress up a single KPI:

| Signal | Raw weight | Source |
| --- | --- | --- |
| Target pace | 0.35 | metrics |
| Forecast vs target | 0.25 | metrics |
| Pipeline coverage | 0.25 | metrics |
| Revenue trend vs previous period | 0.15 | metrics |
| Revenue at risk | 0.12 | intelligence engine |
| Pipeline execution (stalled share) | 0.10 | intelligence engine |
| Team delivery (share of reps behind) | 0.10 | intelligence engine |

The last three arrive only when the intelligence engine supplies them, so the health score
sharpens once the engine has run without the four core signals ever changing meaning.
Weights are renormalised to sum to 1 — adding a signal cannot deflate the score — and each
`HealthSignal` reports the renormalised share it actually contributed.

Each signal is mapped onto 0-100 through an explicit curve, weighted into a score, and
bucketed into **Healthy** (>=80), **On Track** (>=65), **Attention** (>=48), **At Risk**
(>=30) or **Critical**. The one-line explanation names the weakest and strongest signals, so
the status is always traceable back to a number.

## Today's Focus

Today's Focus is not a separate rule set. `useDashboardData` runs the same intelligence
engine the Intelligence page runs, then shows the top five live insights above `low`
severity. The Dashboard and `/intelligence` therefore cannot disagree: one engine, one
health score, one ranking, two presentations.

The card lives in `src/features/intelligence/components/TodaysFocus.tsx` and consumes
`Insight[]` like everything else.

## Analytics

`/analytics` answers "why did we sell what we sold". It reuses the dashboard's primitives, so
revenue, win rate, pipeline and average deal size can never disagree between the two screens.

**Windows.** The dashboard uses calendar periods ("this month"); Analytics uses trailing
windows (7D / 30D / 90D / custom) because the question is "what has been happening lately".
YTD is deliberately identical on both screens - same start, same annual target - so the year
reads the same wherever you look.

**Stage history.** Every opportunity records the stages it entered and when
(`Opportunity.stageHistory`). Without it, conversion could only be guessed from a snapshot of
what happens to be sitting in each stage today.

**The funnel is a cohort, not a flow.** It takes the opportunities that entered the funnel
inside the window and reports how far each of them got. Counting stage entries per stage
inside the window looks reasonable but is not: when the sales cycle is longer than the
window, each stage measures a different set of deals and the ratios become meaningless (an
early build reported a 99% lead-to-qualified rate for exactly this reason). The trade-off is
stated on screen: for a window shorter than the sales cycle, late stages are understated
because part of the cohort is still in play.

```
src/domain/metrics/
├── ranges.ts             Trailing / YTD / custom windows + their targets
├── funnel.ts             Cohort funnel + stage-to-stage conversion
├── customers.ts          Per-account revenue and concentration
├── distribution.ts       Revenue by rep / customer / product / region / industry
├── trend.ts              Per-bucket trend with the previous-period overlay
└── analyticsMetrics.ts   One snapshot for the page

src/domain/insights/analyticsEngine.ts   Deterministic Performance Insights
```

**Insights** are rules, not a model: revenue movement, pace against the commitment, deal-size
and win-rate shifts, the weakest funnel step, coverage, sales-cycle drift, and revenue
concentration by account or by rep. Each has a threshold below which it stays silent, so the
section reports findings rather than filling space.

**Pipeline coverage** is reported as "Ample" above 10x rather than as a headline multiple:
near the end of a window the remaining target shrinks to a rounding error and the ratio stops
carrying information.

## Sales Pipeline

`/pipeline` is where opportunities are worked, not just read. It shares its filter state
across both views, so switching between Kanban and Table keeps the search term, every filter
and the close-date window in place.

**Scope.** The page works on open opportunities plus anything closed in the last 30 days.
Fourteen months of closed history belongs in Analytics; putting it on a board would make the
matching count, the table and the columns disagree with each other.

### Persistence changed here

Until this phase the dataset was regenerated from its seed every session. Now that deals can
be created, edited, moved and deleted, the data is the user's: it is generated **once** per
workspace, then persisted under `ccc:commercial-dataset` and owned from that point on. The
stored copy is only reused when the workspace shape and the generator version both match, so
a changed generator can never leave half-migrated records behind. Resetting the workspace
clears it along with everything else.

### One source of truth

`CommercialDataProvider` holds the dataset and exposes the only four mutations in the app:

```ts
createOpportunity(draft)      updateOpportunity(id, draft)
moveOpportunity(id, stage)    deleteOpportunity(id)
```

Every screen reads that same object, so a deal dragged on the board is already reflected in
the Dashboard KPIs and in Analytics before the drop animation finishes - there is no
synchronisation code anywhere, because there is nothing to synchronise.

The transformations themselves are pure functions in
`src/domain/pipeline/opportunityMutations.ts`, which is where the rules that matter live:

- A stage change appends to `stageHistory`, so the Analytics funnel reflects the move.
- The probability follows the stage default **only while nobody has set it by hand**. Once
  it is edited, `probabilityIsManual` is set and a later drag leaves the figure alone - a
  manual number is the director's judgement, not a default to be overwritten.
- Won and Lost set `closedAt`, which is what makes the deal count as revenue.

### Risk engine

`src/domain/risk/riskEngine.ts` scores a single opportunity from five inputs, in the order
they matter: an expected close date already in the past, inactivity weighted by how near the
close date is, the current stage, probability, and value. It returns a level
(**Healthy / Attention / At risk**), a 0-100 score used only for ranking, the single most
important reason, and every factor that fired. Deterministic and explainable: the UI consumes
the result and never re-derives risk of its own.

### Weighted pipeline

`weightedValue(opportunity) = value x probability`, defined once in
`src/domain/metrics/primitives.ts` and used by the Pipeline, the Dashboard, Analytics and
anything that comes later. There is no second formula anywhere.

### Drag, touch and keyboard

Dragging is the fast path for a mouse (native HTML5 drag and drop, no dependency). It is not
the only path: the deal detail panel carries a stage control that works with a keyboard and
on touch, where dragging a card does not. Below `lg` the board stacks into full-width
sections rather than becoming a wide sideways scroll.

## Sales Team

`/team` turns the per-rep figures the other screens already compute into a performance
management tool: ranking, status, benchmarks, coaching signals and roster management.

### Targets belong to the rep

`SalesRep` now carries `monthlyTarget` and `annualTarget`. Both are optional, and null means
"an equal share of the team commitment" - which is what every rep starts on.

Explicit quotas are honoured **literally**: type 200k and the rep is measured against 200k,
not against a normalised slice of the team number. The team target is therefore the sum of
the individual quotas, and when that sum drifts from the company commitment the page says so
rather than hiding it:

> Individual quotas add up to 506.000 EUR against a company commitment of 520.000 EUR for
> this period.

`buildRepTargets` in `src/domain/metrics/repTargets.ts` resolves this once, and the
Dashboard, Analytics and Team pages all consume it - so a quota set here changes the per-rep
attainment everywhere.

### Performance status

`src/domain/team/teamPerformanceEngine.ts` scores five signals and weights them:

| Signal | Weight |
| --- | --- |
| Target attainment | 30% |
| Pace against the period | 22% |
| Pipeline coverage | 22% |
| Win rate against the team | 16% |
| Revenue trend | 10% |

Attainment alone would punish a rep building a strong pipeline early in a period and reward
one coasting on a single lucky deal, so it is deliberately not the only input. The result is
**On Track / Attention / At Risk / No Data**, and it carries the reasons that produced it -
the UI leads with the weakest signal so the conclusion is arguable.

### Coaching engine

`src/domain/team/coachingEngine.ts` pairs two facts about a rep into something worth a
conversation: high activity with low conversion, strong pipeline with a weak win rate, good
conversion but not enough pipeline, coverage below the threshold, deals gone quiet, growth
ahead of the team, a pipeline leaning on one deal, larger deals with a longer cycle.

Rates are only used once a rep has at least four closed deals, because a win rate over two
deals is noise. No rule concludes that more activity is better - that is not a conclusion the
data supports, and Activity Performance is presented next to revenue and win rate precisely
so the reader can judge for themselves.

### Roster management, without losing deals

Add and edit write to `workspace.team`, the same store Settings uses, so a new rep appears in
the ranking, the filters, the Pipeline owner selector, the Dashboard and Analytics
immediately.

Removal is guarded. If the rep owns opportunities, the dialog says how many, the confirm
button stays disabled until a successor is chosen, and `reassignOpportunities` moves every
deal **and its activity history** across before the rep is removed. Nothing is deleted:
removing a rep with 228 deals leaves the dataset at exactly the same size.

Historical revenue is never editable from this screen - it is derived from won deals, and the
form says so.

## Commercial Intelligence

`/intelligence`. Everything on this screen is produced by a fixed set of rules over the same
commercial data the rest of the app reads. There is no model, no API key and no external
service — and the page says so in its own subheading rather than implying otherwise.

```
commercial data -> deterministic rules -> Insight[] -> UI
```

`src/domain/intelligence/intelligenceEngine.ts` is the only orchestrator. No component ever
runs a rule; they all consume `Insight[]`. Because the boundary is a plain data structure, an
optional interpretation layer could be inserted between the engine and the screen later
without touching a single component.

### The rules

| File | What it decides |
| --- | --- |
| `opportunityScoring.ts` | Per-deal health (0-100) and commercial priority (0-100) |
| `riskRules.ts` | Revenue at risk, target risk, pipeline gap, stalled deals, closing soon, customer concentration |
| `anomalyEngine.ts` | Revenue, win rate, pipeline creation, deal size, activity and per-rep moves against a trailing baseline |
| `teamRules.ts` | Adapts the Team page coaching engine, plus rep concentration |
| `positiveRules.ts` | Momentum, strong pipeline, growth, ahead of pace, growing accounts |
| `priorityEngine.ts` | Turns a rule's draft into a scored, severity-banded insight |
| `thresholds.ts` | Every commercial threshold, in one object |

Thresholds are business policy, so they live in one file rather than scattered through rule
code: stalled at 12 days, imminent at 10, healthy coverage 3x, customer concentration 45%,
five closed deals before a win rate is treated as meaningful, and so on.

### Priority

Every insight is scored on the same four components, whatever rule produced it:

```
financial impact 40% · urgency 30% · confidence 15% · business relevance 15%
```

Impact is measured against the period target rather than in absolute money — 50k means
something very different to a team carrying 200k a month than to one carrying 2M. The score
bands into Critical (>=75), High (>=50), Medium (>=25) and Low; anything the positive rules
raise is banded Positive regardless of score, because good news should never outrank a
critical risk. Two insights with the same money at stake, the same deadline and the same
confidence always score the same.

### Revenue at risk

The number a director is most likely to repeat in a meeting, so it is computed to be
defensible rather than dramatic:

- every open deal is classified **once**, by its health band;
- only deals in **At risk** or **Critical** contribute;
- each contributes its **weighted value** (value x probability), not its face value.

No deal is ever counted twice, and the figure can never exceed the weighted open pipeline.
The methodology sentence is printed under the panel in the UI, not buried here.

### Deal health vs deal priority

Two different questions, deliberately kept apart. **Health** asks how healthy the commercial
situation around a deal is — silence, no stage movement, an expired close date, top-of-funnel
with days to go. **Priority** asks how much the deal deserves the director's attention:
size 30%, probability 25%, urgency 25%, health 20%. Neither is `value x probability`, and
neither ever writes back to probability: that is the rep's judgement and stays theirs.

A history of contact earns a health bonus only while the deal is still being worked — six
logged calls that stopped two weeks ago do not cancel out the silence.

### Deduplication

Stalled deals raise **one** company-level signal ranking every quiet deal in the business.
The per-rep version stays on the Team page, where per-rep context is the point. Without this
the feed filled with four descriptions of one problem — exactly what an intelligence system
is supposed to prevent.

### Insight state is separate from commercial data

`src/data/repository/insightRepository.ts` persists status under `ccc:insight-status`,
keyed by insight id. Dismissing an insight is a statement about the *insight*, never about
the deal, the customer or the rep behind it — the underlying record is untouched, and
resolving an insight on a 726-deal dataset leaves 726 deals.

Ids are derived from the rule and the entity (`risk.stalled`, `risk.pipeline-gap`,
`risk.rep-concentration:rep_1`), never from a counter or a timestamp, so a status set today
still applies after the data regenerates. Resolved and dismissed insights stay reachable
through the status filter and can be reopened.

### Anomalies stay quiet when they cannot speak

`computeBaseline` reads the last six completed months and reports `sufficient` only from
three months of history. Below that, `detectAnomalies` returns nothing and the page says the
comparison is unavailable, rather than inventing a baseline.

## Advanced Commercial Forecast

`/forecast`. One question - where is this period going - answered from the top down. Every
figure on the page comes from a single `ForecastReport`, produced by the engine and hung on
`metrics.forecast`. The Dashboard forecast KPI and the Intelligence forecast rules read the
same object, so the Dashboard cannot say 448k while the Forecast page says 462k.

```
commercial data -> forecast engine -> ForecastReport -> Dashboard / Forecast / Intelligence
```

Nothing is fetched, nothing is random, and the same commercial data always produces the same
report. `forecastConfig.ts` holds every number the model assumes, so changing what the
business believes means editing data rather than rewriting arithmetic.

### Per-deal contribution

```
contribution = value x probability x healthFactor x timingFactor
```

Deliberately not plain `value x probability`: the product already knows whether a deal is
being worked and whether its date leaves any room to slip, and a forecast that ignores both
flatters itself. `healthFactor` comes from the same health bands Commercial Intelligence uses
(healthy 1.00, attention 0.90, at risk 0.65, critical 0.35). `timingFactor` is 1.00 comfortably
inside the period, 0.90 for a deal due in its final week, and 0.50 for one already overdue and
still open.

Equally deliberately it stops at four terms: a director has to be able to read the row in the
opportunity table and reproduce the number, so every factor is one visible multiplier with a
stated reason. Neither factor ever writes back to probability - that is the rep's judgement.

Only deals due on or before the period end are counted. A deal past its date and still open is
counted, at the overdue discount: it has not gone away, it has slipped.

### Scenarios

None of the three is a percentage of the others. Each is a different, stated assumption
evaluated over the same deal-level model, and closed revenue is common to all three because
money already won cannot un-win:

| Scenario | Assumption |
| --- | --- |
| **Worst** | Only deals at 70%+ **and** in a healthy or attention band land. Everything else slips past the period. |
| **Base** | Every open deal due in the period contributes value x probability x health x timing. |
| **Best** | Every non-critical deal converts at its probability lifted toward certainty by its health band, capped at 95%, with no timing discount. |

### Probability of reaching target

```
forecast vs target 45% - coverage 20% - pace 15% - conversion 10% - deal health 10%
```

Each input is mapped onto 0-100 through an explicit curve in `curve.ts` - the same helper the
commercial health score uses, so the two can never drift apart in how they read a ratio. The
forecast gap dominates, as it should, but a forecast that lands on target with thin coverage
and a team behind pace is a less certain thing than the same number with pipeline behind it.

### Forecast confidence

```
banked 30% - likely-deal share 20% - data quality 15% - deal health 15% - concentration 10% - coverage 10%
```

Separate from the forecast value on purpose. A 500k forecast resting on three deals closing in
the last fortnight is a very different statement from a 500k forecast that is 80% already
banked, and a director needs to tell those apart at a glance. Concentration is inverted - the
more the period rests on a handful of deals, the lower the score. Weights are renormalised over
whatever can actually be measured.

Confidence also feeds the **forecast state**: a forecast that clears target on assumptions the
confidence score does not support is reported as At Risk, not On Track. False comfort is the
most expensive kind.

### Path to target

Deals are ranked by `value x probability x health` and taken at **full value**, because a deal
that closes brings in all of it. The panel answers "which deals, if they closed, would cover
the gap" - and never promises that any particular one will.

### Waterfall, timeline and sensitivity

The waterfall walks from closed revenue through high, medium and low-confidence pipeline to the
base forecast, showing the health-and-timing adjustment as its own subtraction so the model's
discount is visible rather than buried. The timeline buckets the forecast by when its deals are
due and flags a period that leans on its final ten days. Sensitivity re-runs the same model at
conversion -10% / current / +10%, and with parts of the pipeline excluded.

### The simulator changes nothing

Three levers - win rate, deal size, extra deals - applied to the same model over the same
unchanged opportunities, derived on every render and written nowhere. `Reset scenario` restores
the defaults, and with the defaults in place the simulator reproduces the headline forecast
exactly.

### Snapshots and accuracy

`ccc:forecast-snapshots` records what the model said at a moment in time, so "what did we
predict two weeks ago" becomes answerable. A snapshot can only be scored once its period has
closed and the real number is known; until then accuracy reports itself as unavailable and says
why. Nothing fabricates a variance.

### Integration

- **Dashboard** The forecast KPI reads `metrics.forecast.value`. Verified in the running app:
  moving a 48.000 EUR deal at 80% to Won raised revenue by exactly 48.000, dropped projected
  pipeline by exactly its 38.400 contribution, and moved both screens to the same new forecast.
- **Analytics** Revenue, target, win rate, average deal size, pipeline and weighted pipeline are
  still the shared primitives. The forecast defines none of them.
- **Intelligence** `forecastRules.ts` consumes the report and raises `forecast.gap`,
  `forecast.confidence`, `forecast.back-loaded`, `forecast.data-quality` and
  `forecast.above-target`. It recomputes nothing. The older "behind pace" rule now stands down
  when the forecast gap rule fires, because they were two readings of one problem.

## Executive Reports & Export

`/reports`. A report centre rather than a page of export buttons: choose what to produce, see
the document that will come out, then send it.

```
config -> shared engines -> ReportDocument -> preview / print / CSV
```

`reportEngine.ts` calculates nothing. It resolves the period, asks `computeCommercialMetrics`
for a snapshot (the forecast rides along on `metrics.forecast`), asks `runIntelligence` for the
insights, and then selects, orders and narrates. That is what makes a report trustworthy: if
the Dashboard says 101.000 EUR, the report says 101.000 EUR, because it is the same call.

Verified in the running app - Dashboard and report side by side: revenue 101.000, growth
+15,4%, attainment 20,2%, forecast 610.660, gap +110.660, pipeline 1.927.500, weighted 817.725,
win rate 100%. Every figure identical.

### Six report types

Executive Commercial, Monthly Performance, Pipeline, Forecast, Sales Team, and Intelligence &
Risk. Each is a named set of sections; picking a type sets its sections, and the toggles are
there to trim rather than to assemble a report from nothing.

### Periods that cannot mismatch

`resolveReportPeriod` does not re-implement what a period is. A completed window is the
existing calendar resolver run with `now` moved to that window's own last day:

| Choice | Resolves to | Target |
| --- | --- | --- |
| This / last month | `mtd`, anchored on today or on the last day of last month | Monthly |
| This / last quarter | `qtd` | Monthly x3 |
| This / last year | `ytd` | Annual |
| Custom range | Its own window | Monthly, pro-rated by days |

So a monthly report gets the monthly target and a yearly report gets the annual one, by
construction rather than by care. Moving `now` also does the right thing downstream: for a
closed period "today" is the day it ended, so deal health, stalled counts and days remaining
are all measured at the close rather than from this morning.

A closed period is marked **Final** and behaves differently throughout: the summary speaks in
the past tense, the forecast section is omitted with a stated reason, and the forecast KPI
becomes **result vs target**. Labelling a finished month with a projection would be two
answers to one question.

### The executive summary is generated, not templated

`summaryGenerator.ts` assembles clauses from whichever facts are true rather than selecting a
prewritten paragraph. A period that beat target and one that missed read differently without
anyone having written both, and a clause with no figure behind it is not written at all. No
model is involved.

### Management highlights

Three lists a director can read in fifteen seconds. **Recommended actions come from the
intelligence insights themselves**, ranked by the priority the engine already assigned, so an
action in a report and an action on the Intelligence page are the same action. Identical
recommendations are listed once rather than repeated down the page.

### The document

A white A4 page with its own palette and typography, scoped to `.report-doc` - not the
dashboard reproduced inside a PDF. What renders on screen is exactly what prints: same markup,
same stylesheet, one definition of the document.

### PDF, print and CSV

**PDF and print go through the browser's own print pipeline.** No renderer is bundled, and
that is the better result rather than the cheaper one: real A4 with `@page` margins, vector
text that stays selectable and searchable, tables that repeat their header across pages, and
sections that avoid breaking mid-way. `[data-print="hide"]` marks the application shell and
`[data-print="document"]` marks the page, so what prints is the document alone. Export PDF
opens the print dialog, where "Save as PDF" is the destination.

**CSV** is written by hand - a correct CSV is one escaping rule and a join. Six datasets
(opportunities, pipeline by stage, team, revenue, forecast, insights) with the columns a
director would actually forward, numbers written raw so a spreadsheet treats them as numbers,
ISO dates that sort, a UTF-8 BOM so Excel opens it without an import wizard, and a leading
quote on any field starting with `=`, `+`, `-` or `@` so a cell is never read as a formula.

**XLSX is deliberately not implemented.** It would mean a dependency for a format that adds
nothing over a CSV a spreadsheet opens natively.

### Filenames

`TERMOCLIMA-INDUSTRIAL_Executive-Commercial-Report_2026-09.pdf`. Accents are folded rather
than stripped, characters Windows rejects are removed, reserved device names are suffixed, and
an empty result falls back rather than producing a nameless file.

### Nothing is fabricated

A section the data cannot support is dropped and the reason is printed: no cohort entered the
funnel, no account booked revenue, no representatives configured, the period has already
closed. `reportValidation.ts` blocks an export that would produce a broken document - no
workspace, no currency, no sections, an incomplete custom range - and each message says what
to do about it.

### History

`ccc:report-history` stores the *configuration* plus a small snapshot of the headline figures,
never a rendered file. Reopening an entry puts the settings back and re-runs the engines over
live data: a closed period reproduces exactly, and the current one shows where the period
actually stands now rather than a stale copy.

### Everything stays local

A Blob, an object URL and a click. Nothing is uploaded, no third-party service sees a figure,
and no cloud storage is involved.

## Tests

```bash
npm test
```

Vitest over the domain engines - no DOM, no snapshots, no mocked data where real seeded data
would do. 226 tests.

**Intelligence (49)** opportunity health and its bands, stalled detection at the threshold
boundary, priority scoring and severity bands, revenue at risk (counted once, weighted, bounded
by the weighted pipeline), pipeline gap, commercial health weighting, and the engine end to end
on a generated dataset: determinism, unique ids, sort order, no duplicate signals, overview
counts agreeing with the list, and status changes leaving the commercial data alone.

**Forecast (50)** determinism; the base forecast being closed revenue plus the contributions and
nothing else; contributions summing to the reported total and never exceeding deal value;
scenarios ordered worst-base-best, sharing the same closed revenue, and demonstrably not
percentages of each other; the gap and attainment arithmetic; target probability bounded and
monotonic in the forecast gap; confidence rising with banked revenue and falling with poor data;
data quality never zeroed by a single check; pipeline exclusions narrowing monotonically; the
simulator reproducing the real forecast at its defaults, never mutating an opportunity and never
modelling a probability above certainty; the path to target covering the gap at full value; the
rep split summing to the company forecast; the waterfall landing exactly on the base forecast;
and accuracy refusing to score a period that has not closed.

**Reports (41)** period resolution and the target each one carries (a completed month gets the
monthly target, a year the annual one, a custom range a pro-rated one); a completed period
anchored on its own last day; custom ranges compared against the same number of days before
them; the report reading the shared metrics layer unchanged; determinism; sections ordered the
document way and dropped with a reason when the data cannot support them; the summary changing
tense for a closed period and never emitting `undefined` or `NaN`; the revenue series
accumulating to the period revenue and target; CSV escaping (separators, embedded quotes,
newlines, formula injection) and one row per record; filename sanitisation including accent
folding and Windows reserved names; and export validation blocking every case that would
produce a broken document.

**Data integrity (24)** the storage boundary: a value that is not a number, a negative value, a
probability of 999 or -50, an unparseable date, an unknown stage, a won deal with no close date,
an open deal carrying one, missing ids, duplicate ids, arrays holding nulls and primitives,
missing arrays entirely - and the guarantee that a deal owned by a rep added after the dataset
was generated survives a reload rather than being deleted.

**Edge cases (32)** an empty workspace, exactly one of everything, a target of zero, a target of
one cent, a target of a trillion, revenue equal to and above target, eight forecast shapes from
no pipeline to one enormous deal, formatters fed NaN and Infinity, and elapsed durations that
must never run backwards.

**Propagation (20)** one field changed on one opportunity, asserted across the Dashboard,
Analytics funnel, Team, Forecast, Intelligence and the report at once - including that changing
the owner moves the rep figures and moves nothing at company level.

**Scale (8)** 3, 10, 50, 200, 500 and 1000 opportunities, plus a ratio assertion that fails on a
nested scan and a budget for the full metrics + intelligence + report derivation.


## Productization pass

A full audit of the finished product, and the fixes it produced.

### Design system

Seventeen arbitrary font sizes replaced by a nine-step scale; page titles unified at
`text-page` (two pages had drifted to 24px); one page rhythm (`space-y-7`) replacing three;
`animate-rise` added to the two pages that lacked it.

### Semantics and accessibility

One `<h1>` per page - the Topbar's section label was a second one on every screen, and five
pages used `<h2>` for their own title. `useDialogFocus` gives the Modal and the Drawer focus
entry, a Tab/Shift+Tab trap and focus restoration to the opener; neither had any of the three.
A global `:focus-visible` ring was already in place, and every interactive control across
eight routes has an accessible name.

### Removing what was not real

The `/accounts` route rendered a "planned features" page carrying a **Phase 5** badge, reached
from a nav item marked "Soon" - a visible control that did nothing, with a developer label on
it. Route, nav entry and `ModulePage` removed. `MetricTile` was a Phase 0 component rendered
nowhere and superseded by `KpiCard`; deleted. Onboarding promised per-rep quotas "in a later
phase" - they have existed since the Team module shipped - and Settings referred to build
phases in user-facing copy. The welcome screen said "Five short steps" for a six-step wizard;
it now derives the count from `ONBOARDING_STEPS`, so the copy cannot drift again.

### Performance

Switching the dashboard period was a **115-141ms long task**. Two findings:

- `computeRepMetrics` ran **three times per render** - once in the metrics layer, again in the
  intelligence engine, again in the report engine - each a full pass over the dataset. The
  latter two now read `metrics.reps`. That also fixed a latent inconsistency: the intelligence
  copy used the owner-scoped target, so a filtered view would have given a rep a different
  target there than on the Team page.
- `isWithin` allocated a `Date` per call, and it is called tens of thousands of times per
  render. `Date.parse` returns a number and allocates nothing. The activity loop's
  running-maximum compared parsed dates where ISO strings of equal length already sort
  lexicographically.

Result: **115/141/118ms → 90/98/86ms**, measured with `PerformanceObserver` on the same
interactions, at 654 opportunities and 1,433 activities.

### Verified, not assumed

- **Responsive** Zero horizontal overflow and zero escaping elements across all eight routes at
  1920, 1440, 1024, 768 and 390px. Zero sub-32px touch targets at 390px.
- **Propagation** Changing the monthly target from 500k to 400k moved Dashboard, Analytics,
  Forecast (attainment 122,1% → 152,7%), Intelligence ("lands 210.660 € above target") and the
  report header together. No stale values.
- **Storage** With all five keys corrupted at once - invalid JSON, wrong types, `null`, a bare
  number - the application does not crash. It falls back to onboarding.
- **First run** Complete zero-data flow through all six onboarding steps into a dashboard
  showing that director's name and their own target. Validation blocks an incomplete step with
  messages that say what to fix, and focus now moves to the first invalid field.
- **Copy** No generic SaaS phrasing, no placeholder text, no TODOs, no AI claims, one product
  name throughout.
- **Security** No `.env` committed, no secrets in source, and **zero external network calls** -
  the application makes none at all.

## Stress test and hardening

A pass spent trying to break the product rather than confirming it works. Five real defects,
each fixed at the level that caused it.

### Corrupted data reached the calculation engines

The workspace had defensive normalisation from the beginning; the commercial dataset never did,
even after it became the user's own data. The repository checked that `opportunities` was an
array and handed whatever was inside it to the engines. Fed a plausible-looking but corrupted
stored dataset, the dashboard produced:

| Figure | Result |
| --- | --- |
| Revenue | `"0hello"` - `total + v` concatenates when a value is a string |
| Weighted pipeline | `10,240,000` from one 10,000 deal stored at `probability: 999` |
| Base forecast | `"0hello8991000"` |
| Forecast gap | `null` |
| Missing `owners` array | `TypeError: Cannot read properties of undefined` |

Broken figures that still look like figures are worse than a crash, because they get repeated in
a board meeting. `normaliseDataset` is now the boundary where untrusted JSON becomes a domain
object: every field is coerced or the record is dropped, and what survives satisfies the
invariants the engines assume.

**The first version of that fix was itself a bug.** It dropped any opportunity whose owner was
not in the stored roster - but that roster is deliberately stale, because the live one comes from
`workspace.team`. It would have silently deleted the deals of every rep added in Settings on the
next reload. Caught by a regression test before it shipped, and the policy corrected: normalise
fields, never destroy a record over an unresolvable reference.

### The best case could land below the base case

Two ways, both visible on the Forecast page as "Best Case" showing less than "Base Case":

- a deal the rep had marked at 100% was capped to the 95% best-case ceiling;
- a critical deal was excluded from the best case entirely while the base case still credited it
  at 0.35x, so a pipeline of stalled deals showed Best Case 0 against Base Case 1,750.

The best case for a bad deal is that it closes as currently modelled, not that it vanishes. That
is now an invariant, asserted per deal and in aggregate.

### "-1 days in this stage"

`now` is pinned when a screen mounts, so a deal created a moment later carries a timestamp after
it, and `Math.floor` of a small negative gives -1. The intelligence and risk engines each wrapped
the call in their own `Math.max(0, ...)`; four other call sites did not. An elapsed duration is
never negative, so the clamp moved into `daysSince` and the two duplicate guards came out.
`daysUntil` stays signed - a negative there means overdue, and the forecast timing factor reads it.

### NaN printed onto KPI tiles

`formatCurrency` coerced a non-finite value to zero; `formatNumber` and `formatPercent` did not,
so anything non-finite arriving from upstream rendered the literal text "NaN". They now return an
em dash, the same thing the tables already show for a figure that is not available.

### A source file that read as binary

`reportNaming.ts` matched accents with a literal combining-mark range, which made grep and other
line-based tooling treat it as a binary file. Replaced with the escaped equivalent.

### What was attacked and held

- **Routing** all eleven routes opened directly, plus `/` and `/settings` redirects and an unknown
  route: no blank screens, no crashes, correct 404.
- **Search** case variants, padded whitespace, accented characters, `%%%`, `...`, a no-match query,
  an empty query and `<script>alert(1)</script>` - which matched nothing and executed nothing.
- **Drag and drop** Lead to Negotiation through real HTML5 drag events: stage persisted, probability
  moved to the stage default, history recorded, and after a full reload the weighted pipeline had
  moved by exactly 64,999 - the deal's 99,999 times the 0.65 probability change.
- **Deletion** the confirmation states the consequence, Cancel preserves the deal, and confirming
  leaves zero orphaned activities.
- **Currency** EUR, USD, GBP and JPY switched through Settings: every screen followed, nothing mixed.
- **Scale** 1000 opportunities and 3000 activities derive in 21ms; the full metrics, intelligence
  and report pass takes 79ms.
- **Responsive** zero overflow and zero sub-32px touch targets at 360x800 as well as the five sizes
  already covered.
- **Dead controls** every button on the executive screens clicked: the only ones with no effect were
  filter buttons already in their active state.
- **Security** no `innerHTML`, no `eval`, no secrets, and zero external hosts referenced anywhere in
  the source.

## Security and privacy

Everything happens in the browser. There is no backend, no account, no sign-in, no telemetry,
and **no external request of any kind** - verified by loading every screen and reading the
resource timeline: 233 requests, all of them to the local dev server. Even the typeface is
bundled (`@fontsource-variable/inter`) rather than pulled from Google Fonts, so opening the app
does not leak a visitor's IP to a third party.

### Read this before entering real commercial data

**The data is stored unencrypted in `localStorage`.** That is a deliberate trade-off for a
local-first tool with no backend, but it has consequences worth stating plainly:

- Anyone with access to the browser profile can read every figure - open DevTools, look at
  `ccc:workspace` and `ccc:commercial-dataset`, and the whole pipeline is there in plain JSON.
- It is not protected by the operating system's user account once that account is unlocked.
- A shared or kiosk machine, a synced browser profile, or a browser extension with storage
  permission can all reach it.
- Clearing site data deletes everything, with no copy anywhere else.

The bundled demo dataset is entirely fictional - 37 invented account names, generated
deterministically from a seed. It exists so the engines have something to chew on. If you point
this at a real pipeline, treat the machine as you would treat a spreadsheet of the same
information.

### What was checked before publishing

| Check | Result |
| --- | --- |
| Secrets, API keys, tokens, credentials in source | none |
| `.env` files committed | none; `.env` and `.env.*` are ignored |
| Personal data, email addresses, machine paths | none |
| External hosts referenced anywhere in source | none |
| Network requests at runtime | zero, across every screen |
| `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function` | none |
| XSS via search input (`<script>alert(1)</script>`) | matched nothing, executed nothing |
| Dependency vulnerabilities (`npm audit`) | 0 |
| Dependency licences | MIT, ISC, OFL-1.1 - all permissive |
| Build output (`dist/`) committed | no, ignored |

`react-router-dom` was upgraded from 6.30 to 7.18 during this review. The two moderate
advisories against 6.x were **not reachable in this application** - the open-redirect one needs a
user-controlled navigation target, and every `to` in the codebase is a hardcoded literal, while
the `deserializeErrors` one is in the SSR hydration path and this is a pure client-side SPA. The
upgrade happened anyway, because a public repository showing two Dependabot alerts costs more in
credibility than the migration cost, which was one obsolete prop.

### Not implemented, by design

No authentication, no authorisation, no encryption at rest, no audit log, no multi-user
separation. This is a single-user local tool. Any of those would require the backend the
architecture is deliberately ready for but does not have - see `src/data/repository/index.ts`,
which is the only file naming a concrete storage implementation.

## Possible future work

Deliberately not built - each is a feature, not a polish item:

- **Accounts** The customer base as its own module. Customer analysis currently lives inside
  Analytics and the reports.
- **A backend** `src/data/repository/index.ts` is still the only place naming a concrete
  implementation, so swapping localStorage for an API stays a small change.
- **Forecast accuracy over time** The snapshot model and scoring already exist; it needs
  periods to actually close.
- **Multi-currency** One reporting currency is assumed throughout.
- **Undo for destructive actions** Deletion is confirmed today; a toast-level undo would be
  gentler.
