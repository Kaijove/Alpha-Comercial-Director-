import { DEFAULT_PREFERENCES } from '@/domain/defaults'
import {
  ACTIVITY_LABELS,
  STAGES,
  STAGE_DEFAULT_PROBABILITY,
  type Activity,
  type ActivityType,
  type CommercialDataset,
  type Customer,
  type Opportunity,
  type Owner,
  type Stage,
  type StageEvent,
} from '@/domain/commerce'
import { WORKSPACE_SCHEMA_VERSION, type Workspace } from '@/domain/workspace'

type UnknownRecord = Record<string, unknown>

/**
 * Defensive normalisation + forward migration.
 *
 * Anything read back from disk is untrusted: users can clear keys, older builds
 * may have written fewer fields, and future versions will add more. This keeps
 * the app booting instead of crashing on a half-written workspace.
 */
export function migrateWorkspace(input: unknown): Workspace | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as UnknownRecord

  const director = (raw.director ?? {}) as UnknownRecord
  const company = (raw.company ?? {}) as UnknownRecord
  const goals = (raw.goals ?? {}) as UnknownRecord
  const preferences = (raw.preferences ?? {}) as UnknownRecord
  const team = Array.isArray(raw.team) ? (raw.team as UnknownRecord[]) : []

  const str = (value: unknown, fallback = '') =>
    typeof value === 'string' ? value : fallback
  const num = (value: unknown, fallback = 0) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback

  const name = str(company.name)
  if (!name && !str(director.firstName)) return null

  const now = new Date().toISOString()

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
    onboardingCompletedAt:
      typeof raw.onboardingCompletedAt === 'string' ? raw.onboardingCompletedAt : null,
    director: {
      firstName: str(director.firstName),
      lastName: str(director.lastName),
      jobTitle: str(director.jobTitle, 'Sales Director'),
    },
    company: {
      name,
      sector: str(company.sector, 'Other'),
      country: str(company.country),
      currency: str(company.currency, 'EUR'),
      logo: typeof company.logo === 'string' ? company.logo : null,
    },
    goals: {
      monthlyTarget: num(goals.monthlyTarget),
      annualTarget: num(goals.annualTarget),
    },
    team: team
      .map((rep, index) => ({
        id: str(rep.id, `rep_${index}`),
        name: str(rep.name),
        role: str(rep.role),
        accent: num(rep.accent, index),
        // Added after the first release; older workspaces simply have none.
        monthlyTarget:
          typeof rep.monthlyTarget === 'number' && rep.monthlyTarget > 0
            ? rep.monthlyTarget
            : null,
        annualTarget:
          typeof rep.annualTarget === 'number' && rep.annualTarget > 0
            ? rep.annualTarget
            : null,
        region: typeof rep.region === 'string' && rep.region ? rep.region : null,
        email: typeof rep.email === 'string' && rep.email ? rep.email : null,
      }))
      .filter((rep) => rep.name.length > 0),
    preferences: {
      locale: str(preferences.locale, DEFAULT_PREFERENCES.locale),
      fiscalYearStart: (num(
        preferences.fiscalYearStart,
        DEFAULT_PREFERENCES.fiscalYearStart,
      ) as Workspace['preferences']['fiscalYearStart']),
      weekStartsOn:
        preferences.weekStartsOn === 'sunday'
          ? 'sunday'
          : DEFAULT_PREFERENCES.weekStartsOn,
      compactNumbers:
        typeof preferences.compactNumbers === 'boolean'
          ? preferences.compactNumbers
          : DEFAULT_PREFERENCES.compactNumbers,
    },
  }
}

// ---------------------------------------------------------------------------
// Commercial dataset
// ---------------------------------------------------------------------------

/**
 * Defensive normalisation for the commercial dataset.
 *
 * The workspace has had this since the beginning; the dataset never did, and it
 * became the user's own data the moment opportunities could be edited. Until
 * now the repository checked only that `opportunities` and `customers` were
 * arrays and handed whatever was inside them straight to the engines.
 *
 * That was enough to produce genuinely broken commercial figures rather than a
 * crash, which is worse: a stored `value: "hello"` turned revenue into the
 * string `"0hello"` (`total + v` concatenates), and a stored `probability: 999`
 * turned a 10,000 deal into 9,990,000 of weighted pipeline on the dashboard.
 *
 * So this is the boundary where untrusted JSON becomes a domain object. Every
 * field is coerced or the record is dropped, and a record that survives is
 * guaranteed to satisfy the invariants the engines assume: finite non-negative
 * value, probability in 0..1, parseable dates, a known stage, and an owner and
 * customer that actually exist.
 */
const isStage = (value: unknown): value is Stage =>
  typeof value === 'string' && (STAGES as readonly string[]).includes(value)

const isActivityType = (value: unknown): value is ActivityType =>
  typeof value === 'string' && Object.hasOwn(ACTIVITY_LABELS, value)

/**
 * A finite number, or the fallback. A numeric field holding a string is
 * corruption rather than a format, so nothing is coerced from text.
 */
const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** An ISO timestamp the date helpers can actually parse, or the fallback. */
const isoDate = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback
  return Number.isNaN(Date.parse(value)) ? fallback : value
}

const nonEmptyId = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null

function normaliseOwners(raw: unknown): Owner[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const owners: Owner[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as UnknownRecord
    const id = nonEmptyId(record.id)
    // A duplicated id makes `ownerById` ambiguous and double-counts revenue.
    if (!id || seen.has(id)) continue
    seen.add(id)
    owners.push({
      id,
      name:
        typeof record.name === 'string' && record.name.trim()
          ? record.name
          : 'Unnamed rep',
      role: typeof record.role === 'string' ? record.role : '',
      accent: Math.max(0, Math.trunc(finite(record.accent, 0))),
    })
  }

  return owners
}

function normaliseCustomers(raw: unknown, now: string): Customer[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const customers: Customer[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as UnknownRecord
    const id = nonEmptyId(record.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    customers.push({
      id,
      name:
        typeof record.name === 'string' && record.name.trim()
          ? record.name
          : 'Unknown account',
      industry: typeof record.industry === 'string' ? record.industry : '',
      region: typeof record.region === 'string' ? record.region : '',
      createdAt: isoDate(record.createdAt, now),
    })
  }

  return customers
}

function normaliseStageHistory(
  raw: unknown,
  stage: Stage,
  enteredAt: string,
): StageEvent[] {
  const events = Array.isArray(raw)
    ? raw
        .filter(
          (entry): entry is UnknownRecord =>
            Boolean(entry) && typeof entry === 'object',
        )
        .map((entry) => ({
          stage: isStage(entry.stage) ? entry.stage : null,
          at: isoDate(entry.at, ''),
        }))
        .filter(
          (entry): entry is StageEvent => entry.stage !== null && entry.at !== '',
        )
        .sort((a, b) => a.at.localeCompare(b.at))
    : []

  // Stage-to-stage conversion is derived from this history, so an empty or
  // corrupted one would silently zero the funnel. Rebuild the minimum that
  // keeps it coherent.
  if (events.length === 0) return [{ stage, at: enteredAt }]
  if (events[events.length - 1].stage !== stage) events.push({ stage, at: enteredAt })
  return events
}

function normaliseOpportunities(raw: unknown, now: string): Opportunity[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const opportunities: Opportunity[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as UnknownRecord

    const id = nonEmptyId(record.id)
    if (!id || seen.has(id)) continue

    // A deal must know who owns it and who it is for, but the ids are NOT
    // checked against the stored roster.
    //
    // `dataset.owners` is deliberately stale: the live roster comes from
    // `workspace.team`, so a rep added in Settings is not in the stored copy and
    // their deals would have been deleted on the next reload. An unresolvable
    // owner renders as "Unassigned", which is the designed behaviour and
    // produces no broken figures - and this normaliser exists to stop broken
    // figures, not to enforce referential purity by destroying a director's
    // opportunities.
    const ownerId = nonEmptyId(record.ownerId)
    const customerId = nonEmptyId(record.customerId)
    if (!ownerId || !customerId) continue

    const stage: Stage = isStage(record.stage) ? record.stage : 'lead'

    // Negative revenue is not a discount, it is corruption.
    const value = Math.max(0, finite(record.value, 0))

    // Probability is a share, so it lives in 0..1 whatever was stored. A value
    // outside that range is not rescaled - there is no way to know what 999 was
    // meant to mean - so it falls back to the stage default.
    const storedProbability = finite(record.probability, Number.NaN)
    const probability =
      storedProbability >= 0 && storedProbability <= 1
        ? storedProbability
        : STAGE_DEFAULT_PROBABILITY[stage]

    const createdAt = isoDate(record.createdAt, now)
    const stageEnteredAt = isoDate(record.stageEnteredAt, createdAt)
    const closed = stage === 'won' || stage === 'lost'

    seen.add(id)
    opportunities.push({
      id,
      name:
        typeof record.name === 'string' && record.name.trim()
          ? record.name
          : 'Untitled opportunity',
      customerId,
      ownerId,
      stage,
      value,
      probability,
      probabilityIsManual: record.probabilityIsManual === true,
      expectedCloseDate: isoDate(record.expectedCloseDate, createdAt),
      createdAt,
      updatedAt: isoDate(record.updatedAt, createdAt),
      lastActivityAt: isoDate(record.lastActivityAt, createdAt),
      // A won deal with no close date is excluded from revenue by every period
      // filter; an open deal carrying one is counted as closed.
      closedAt: closed ? isoDate(record.closedAt, stageEnteredAt) : null,
      product: typeof record.product === 'string' ? record.product : '',
      source: typeof record.source === 'string' ? record.source : '',
      region: typeof record.region === 'string' ? record.region : '',
      notes: typeof record.notes === 'string' ? record.notes : '',
      stageHistory: normaliseStageHistory(record.stageHistory, stage, stageEnteredAt),
      stageEnteredAt,
    })
  }

  return opportunities
}

function normaliseActivities(raw: unknown, now: string): Activity[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const activities: Activity[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as UnknownRecord

    const id = nonEmptyId(record.id)
    const opportunityId = nonEmptyId(record.opportunityId)
    const ownerId = nonEmptyId(record.ownerId)
    if (!id || seen.has(id) || !opportunityId || !ownerId) continue

    seen.add(id)
    activities.push({
      id,
      opportunityId,
      ownerId,
      type: isActivityType(record.type) ? record.type : 'note',
      at: isoDate(record.at, now),
      summary: typeof record.summary === 'string' ? record.summary : '',
    })
  }

  return activities
}

/**
 * Normalises a stored dataset, or returns null when it is beyond repair.
 *
 * Null means "regenerate": a fresh coherent workspace beats a screen of figures
 * derived from wreckage.
 */
export function normaliseDataset(input: unknown): CommercialDataset | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as UnknownRecord

  const now = new Date().toISOString()

  const owners = normaliseOwners(raw.owners)
  const customers = normaliseCustomers(raw.customers, now)
  const opportunities = normaliseOpportunities(raw.opportunities, now)
  const activities = normaliseActivities(raw.activities, now)

  // Owners and customers are the spine every figure hangs off; without them
  // there is nothing to normalise the rest against.
  if (owners.length === 0 || customers.length === 0) return null

  return {
    generatorVersion: finite(raw.generatorVersion, -1),
    seed: finite(raw.seed, 0),
    generatedAt: isoDate(raw.generatedAt, now),
    owners,
    customers,
    opportunities,
    activities,
  }
}
