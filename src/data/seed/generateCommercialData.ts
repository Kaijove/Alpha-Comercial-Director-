import {
  ACTIVITY_LABELS,
  OPEN_STAGES,
  STAGE_DEFAULT_PROBABILITY,
  type Activity,
  type ActivityType,
  type CommercialDataset,
  type Customer,
  type Opportunity,
  SOLO_OWNER_ID,
  type Owner,
  type Stage,
  type StageEvent,
} from '@/domain/commerce'
import { directorFullName, type Workspace } from '@/domain/workspace'
import {
  addDays,
  endOfMonth,
  startOfDay,
  startOfMonth,
  toIso,
} from '@/lib/dates'
import { createRng, hashSeed, roundDealValue, type Rng } from './rng'
import {
  ACTIVITY_SUMMARIES,
  CUSTOMER_NAMES,
  DEAL_SOURCES,
  INDUSTRIES,
  REGIONS,
  productsForSector,
} from './dictionaries'

/** Bump when the shape or distribution of generated data changes. */
export const GENERATOR_VERSION = 1

/** Months of closed history generated behind the current month. */
const HISTORY_MONTHS = 13

/**
 * Open pipeline as a multiple of the monthly target.
 *
 * Tuned so the share expected to land inside the current month, once weighted
 * by probability, produces a forecast in a believable band around the target
 * instead of several times it.
 */
const PIPELINE_MULTIPLE = 3.8

const FALLBACK_MONTHLY_TARGET = 120_000

interface OwnerProfile extends Owner {
  /** Relative revenue contribution. Creates a believable ranking spread. */
  strength: number
  /** Personal win rate, 0..1. */
  winRate: number
  /** Typical days from creation to close. */
  cycleDays: number
  /** Multiplier applied to their typical deal size. */
  dealSizeFactor: number
  /** How diligently they log activity; drives stalled-deal signals. */
  diligence: number
}

/**
 * Expected close dates are drawn first and the stage is derived from them.
 * Doing it the other way round produced pipelines where nearly everything was
 * scheduled to land inside the current month.
 */
const CLOSE_BUCKETS: { weight: number; range: [number, number] }[] = [
  { weight: 0.32, range: [1, 30] },
  { weight: 0.31, range: [31, 62] },
  { weight: 0.24, range: [63, 100] },
  { weight: 0.13, range: [101, 165] },
]

/**
 * Where a lost deal dies. Drives the stage-to-stage conversion the funnel
 * reports, so it is deliberately weighted towards the top of the funnel.
 */
const LOST_AT_STAGE: { stage: Stage; weight: number }[] = [
  { stage: 'lead', weight: 0.3 },
  { stage: 'qualified', weight: 0.28 },
  { stage: 'proposal', weight: 0.24 },
  { stage: 'negotiation', weight: 0.18 },
]

/** Plausible stage mixes for a deal closing in N days. */
const STAGE_BY_HORIZON: { maxDays: number; mix: { stage: Stage; weight: number }[] }[] = [
  {
    maxDays: 20,
    mix: [
      { stage: 'negotiation', weight: 0.6 },
      { stage: 'proposal', weight: 0.3 },
      { stage: 'qualified', weight: 0.1 },
    ],
  },
  {
    maxDays: 45,
    mix: [
      { stage: 'proposal', weight: 0.45 },
      { stage: 'negotiation', weight: 0.2 },
      { stage: 'qualified', weight: 0.3 },
      { stage: 'lead', weight: 0.05 },
    ],
  },
  {
    maxDays: 80,
    mix: [
      { stage: 'qualified', weight: 0.45 },
      { stage: 'proposal', weight: 0.25 },
      { stage: 'lead', weight: 0.3 },
    ],
  },
  {
    maxDays: Infinity,
    mix: [
      { stage: 'lead', weight: 0.65 },
      { stage: 'qualified', weight: 0.3 },
      { stage: 'proposal', weight: 0.05 },
    ],
  },
]

/**
 * Builds the whole simulated commercial history for a workspace.
 *
 * Everything is derived from one seed, so the same workspace always yields the
 * same customers, deals and activities. Volumes and values are scaled from the
 * director's own monthly target, so the figures stay coherent with the targets
 * captured during onboarding.
 */
export function generateCommercialData(
  workspace: Workspace,
  now: Date = new Date(),
): CommercialDataset {
  // The seed deliberately excludes the targets: editing a target rescales the
  // figures but must not reshuffle the account base or the deal history.
  const seed = hashSeed(`${workspace.company.name}|${workspace.createdAt}`)
  const rng = createRng(seed)

  const monthlyTarget =
    workspace.goals.monthlyTarget > 0 ? workspace.goals.monthlyTarget : FALLBACK_MONTHLY_TARGET

  const owners = buildOwnerProfiles(workspace, rng)
  // Enough deals per month that a few land in the first days of a month;
  // with only a couple of very large deals the early-month view reads as empty
  // even though the simulation is behaving correctly.
  const dealsPerMonth = Math.min(90, Math.max(10, Math.round(owners.length * 4.5)))
  const avgDeal = monthlyTarget / dealsPerMonth
  const customers = buildCustomers(owners.length, rng, now)
  const products = productsForSector(workspace.company.sector)

  const opportunities: Opportunity[] = []
  let dealCounter = 0
  const nextDealId = () => {
    dealCounter += 1
    return `opp_${String(dealCounter).padStart(4, '0')}`
  }

  const strengthTotal = owners.reduce((sum, owner) => sum + owner.strength, 0)

  // ---- Closed history -----------------------------------------------------
  for (let offset = HISTORY_MONTHS; offset >= 0; offset -= 1) {
    const monthStart = startOfMonth(now, -offset)
    const monthEnd = endOfMonth(monthStart)
    const isCurrentMonth = offset === 0

    // Slow underlying growth plus a monthly wave, both seeded.
    const trend = 1 + (HISTORY_MONTHS - offset) * 0.006
    const wave = rng.float(0.9, 1.14)
    let monthRevenue = monthlyTarget * trend * wave

    if (isCurrentMonth) {
      // Draw a whole month slightly behind target, then keep only the deals
      // that have actually closed by now. Spreading a full month's deals and
      // cutting at today is far closer to reality than scaling the month down.
      monthRevenue = monthlyTarget * trend * wave * 0.93
    }

    for (const owner of owners) {
      const share = monthRevenue * (owner.strength / strengthTotal)
      const ownerAvg = avgDeal * owner.dealSizeFactor

      // Decide how many deals the share represents *before* generating them.
      // Filling a while-loop until the share is covered overshoots badly when
      // the share is smaller than a single deal, which is exactly the case in
      // the first days of a month.
      const wonCount = countFor(share, ownerAvg, rng)
      const perDeal = wonCount > 0 ? share / wonCount : 0

      for (let i = 0; i < wonCount; i += 1) {
        const value = roundDealValue(
          rng.around(perDeal, perDeal * 0.35, perDeal * 0.45, perDeal * 1.9),
        )
        const closedAt = randomDateInMonth(rng, monthStart, monthEnd, null)
        // Deals dated after today simply have not happened yet.
        if (!closedAt || (isCurrentMonth && closedAt.getTime() > now.getTime())) continue

        opportunities.push(
          buildClosedOpportunity({
            id: nextDealId(),
            stage: 'won',
            value,
            closedAt,
            owner,
            rng,
            customers,
            products,
          }),
        )
      }

      // Lost deals implied by this rep's personal win rate.
      const lostCount = Math.round((wonCount * (1 - owner.winRate)) / Math.max(owner.winRate, 0.1))
      for (let i = 0; i < lostCount; i += 1) {
        const value = roundDealValue(
          rng.around(ownerAvg * 0.9, ownerAvg * 0.5, ownerAvg * 0.25, ownerAvg * 2.2),
        )
        const closedAt = randomDateInMonth(rng, monthStart, monthEnd, null)
        if (!closedAt || (isCurrentMonth && closedAt.getTime() > now.getTime())) continue

        opportunities.push(
          buildClosedOpportunity({
            id: nextDealId(),
            stage: 'lost',
            value,
            closedAt,
            owner,
            rng,
            customers,
            products,
          }),
        )
      }
    }
  }

  // ---- Open pipeline ------------------------------------------------------
  const pipelineTarget = monthlyTarget * PIPELINE_MULTIPLE
  let pipelineBooked = 0
  let guard = 0

  while (pipelineBooked < pipelineTarget && guard < 900) {
    guard += 1
    const closeIn = pickCloseHorizon(rng)
    const stage = pickStageForHorizon(closeIn, rng)
    const owner = pickOwner(owners, rng, strengthTotal)
    const stageSizeFactor = stage === 'negotiation' ? 1.2 : stage === 'proposal' ? 1.08 : 0.92
    const ownerAvg = avgDeal * owner.dealSizeFactor * stageSizeFactor
    const value = roundDealValue(
      rng.around(ownerAvg, ownerAvg * 0.55, ownerAvg * 0.3, ownerAvg * 3),
    )

    opportunities.push(
      buildOpenOpportunity({
        id: nextDealId(),
        stage,
        value,
        closeIn,
        owner,
        rng,
        customers,
        products,
        now,
      }),
    )
    pipelineBooked += value
  }

  const activities = buildActivities(opportunities, rng, now)

  return {
    generatorVersion: GENERATOR_VERSION,
    seed,
    generatedAt: toIso(now),
    owners: owners.map(({ id, name, role, accent }) => ({ id, name, role, accent })),
    customers,
    opportunities,
    activities,
  }
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildOwnerProfiles(workspace: Workspace, rng: Rng): OwnerProfile[] {
  const base =
    workspace.team.length > 0
      ? workspace.team.map((rep) => ({
          id: rep.id,
          name: rep.name,
          role: rep.role || 'Account Executive',
          accent: rep.accent,
        }))
      : [
          {
            id: SOLO_OWNER_ID,
            name: directorFullName(workspace.director) || 'You',
            role: workspace.director.jobTitle || 'Sales Director',
            accent: 0,
          },
        ]

  return base.map((owner, index) => ({
    ...owner,
    // Spread performance so the ranking is meaningful but never absurd.
    strength: rng.float(0.72, 1.34),
    winRate: rng.float(0.24, 0.46),
    cycleDays: Math.round(rng.float(24, 58)),
    dealSizeFactor: rng.float(0.75, 1.35),
    diligence: rng.float(0.55, 0.95),
    accent: owner.accent ?? index,
  }))
}

function buildCustomers(ownerCount: number, rng: Rng, now: Date): Customer[] {
  const count = Math.min(CUSTOMER_NAMES.length, Math.max(14, ownerCount * 5))
  return rng
    .shuffle(CUSTOMER_NAMES)
    .slice(0, count)
    .map((name, index) => ({
      id: `cus_${String(index + 1).padStart(3, '0')}`,
      name,
      industry: rng.pick(INDUSTRIES),
      region: rng.pick(REGIONS),
      createdAt: toIso(addDays(now, -rng.int(120, 1500))),
    }))
}

interface DealSeed {
  id: string
  stage: Stage
  value: number
  owner: OwnerProfile
  rng: Rng
  customers: Customer[]
  products: string[]
}

function buildClosedOpportunity(seed: DealSeed & { closedAt: Date }): Opportunity {
  const { id, stage, value, owner, rng, customers, products, closedAt } = seed
  const customer = rng.pick(customers)
  const cycle = Math.round(rng.around(owner.cycleDays, 12, 8, 120))
  const createdAt = addDays(closedAt, -cycle)

  // A won deal walked the whole funnel; a lost one stopped somewhere.
  const reached: Stage[] =
    stage === 'won'
      ? [...OPEN_STAGES]
      : OPEN_STAGES.slice(0, OPEN_STAGES.indexOf(pickLostStage(rng)) + 1)

  const stageHistory = buildStageHistory(reached, createdAt, closedAt, rng)
  stageHistory.push({ stage, at: toIso(closedAt) })

  return {
    id,
    name: buildDealName(rng, products),
    customerId: customer.id,
    ownerId: owner.id,
    stage,
    value,
    probability: stage === 'won' ? 1 : 0,
    probabilityIsManual: false,
    expectedCloseDate: toIso(closedAt),
    createdAt: toIso(createdAt),
    updatedAt: toIso(closedAt),
    lastActivityAt: toIso(closedAt),
    closedAt: toIso(closedAt),
    product: rng.pick(products),
    source: rng.pick(DEAL_SOURCES),
    region: customer.region,
    notes: '',
    stageHistory,
    stageEnteredAt: toIso(closedAt),
  }
}

function buildOpenOpportunity(
  seed: DealSeed & { now: Date; closeIn: number },
): Opportunity {
  const { id, stage, value, owner, rng, customers, products, now } = seed
  const customer = rng.pick(customers)

  // A small, deterministic slice of deals is already past its expected close.
  const overdue = stage !== 'lead' && rng.chance(0.07)
  const closeIn = overdue ? -rng.int(1, 12) : seed.closeIn
  const expectedClose = addDays(startOfDay(now), closeIn)

  const ageDays =
    stage === 'negotiation'
      ? rng.int(35, 110)
      : stage === 'proposal'
        ? rng.int(22, 80)
        : stage === 'qualified'
          ? rng.int(10, 55)
          : rng.int(2, 30)

  // Stale deals are driven by the owner's diligence, so signals cluster
  // realistically around specific reps instead of being sprinkled at random.
  const stale = rng.next() > owner.diligence
  const inactivityDays = stale ? rng.int(11, 32) : rng.int(0, 7)

  const baseProbability = STAGE_DEFAULT_PROBABILITY[stage]
  const probability = clamp(
    Math.round((baseProbability + rng.float(-0.08, 0.1)) * 20) / 20,
    0.05,
    0.9,
  )

  const createdAt = addDays(now, -ageDays)
  const reached = OPEN_STAGES.slice(0, OPEN_STAGES.indexOf(stage) + 1)
  const stageHistory = buildStageHistory(reached, createdAt, now, rng)
  const stageEnteredAt = stageHistory[stageHistory.length - 1].at

  return {
    id,
    name: buildDealName(rng, products),
    customerId: customer.id,
    ownerId: owner.id,
    stage,
    value,
    probability,
    probabilityIsManual: false,
    expectedCloseDate: toIso(expectedClose),
    createdAt: toIso(createdAt),
    updatedAt: toIso(addDays(now, -Math.min(inactivityDays, ageDays))),
    lastActivityAt: toIso(addDays(now, -Math.min(inactivityDays, ageDays))),
    closedAt: null,
    product: rng.pick(products),
    source: rng.pick(DEAL_SOURCES),
    region: customer.region,
    notes: '',
    stageHistory,
    stageEnteredAt,
  }
}

/**
 * Spreads stage entries across the life of a deal.
 *
 * Later stages get progressively shorter dwell times, which is what makes the
 * derived stage-to-stage durations look like a real sales process.
 */
function buildStageHistory(
  reached: Stage[],
  from: Date,
  to: Date,
  rng: Rng,
): StageEvent[] {
  const span = Math.max(1, to.getTime() - from.getTime())
  // Weights sum to 1 across the stages actually reached.
  const weights = reached.map((_, index) => 1 / (index + 1.35))
  const total = weights.reduce((sum, weight) => sum + weight, 0)

  let elapsed = 0
  return reached.map((stage, index) => {
    const at = new Date(from.getTime() + elapsed * span)
    elapsed += (weights[index] / total) * rng.float(0.85, 1.15)
    elapsed = Math.min(elapsed, 0.98)
    return { stage, at: toIso(at) }
  })
}

function pickLostStage(rng: Rng): Stage {
  const roll = rng.next()
  let cumulative = 0
  for (const entry of LOST_AT_STAGE) {
    cumulative += entry.weight
    if (roll <= cumulative) return entry.stage
  }
  return 'qualified'
}

function buildDealName(rng: Rng, products: string[]): string {
  const product = rng.pick(products)
  if (rng.chance(0.18)) return `${product} - phase 2`
  if (rng.chance(0.12)) return `${product} (renewal)`
  return product
}

/**
 * Activities are only generated where they carry signal: every open deal, plus
 * deals closed in the last four months. Older history does not need a timeline.
 */
function buildActivities(
  opportunities: Opportunity[],
  rng: Rng,
  now: Date,
): Activity[] {
  const activities: Activity[] = []
  const cutoff = addDays(now, -120).getTime()
  let counter = 0

  const relevant = opportunities.filter(
    (opportunity) =>
      opportunity.closedAt === null || new Date(opportunity.closedAt).getTime() >= cutoff,
  )

  for (const opportunity of relevant) {
    const start = new Date(opportunity.createdAt).getTime()
    const end = new Date(opportunity.lastActivityAt).getTime()
    const span = Math.max(end - start, 86_400_000)
    const count = rng.int(3, 9)

    const types: ActivityType[] = ['call', 'meeting', 'email', 'follow-up', 'note']
    const stamps = Array.from({ length: count }, () => start + rng.next() * span).sort(
      (a, b) => a - b,
    )

    stamps.forEach((stamp, index) => {
      counter += 1
      const type: ActivityType =
        index === 0
          ? 'call'
          : index === stamps.length - 1 && opportunity.stage === 'proposal'
            ? 'proposal'
            : rng.pick(types)
      const pool = ACTIVITY_SUMMARIES[type] ?? [ACTIVITY_LABELS[type]]

      activities.push({
        id: `act_${String(counter).padStart(5, '0')}`,
        opportunityId: opportunity.id,
        ownerId: opportunity.ownerId,
        type,
        at: toIso(new Date(stamp)),
        summary: rng.pick(pool),
      })
    })
  }

  return activities
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** How many deals a revenue share represents, keeping the fractional part. */
function countFor(share: number, averageValue: number, rng: Rng): number {
  if (share <= 0 || averageValue <= 0) return 0
  const raw = share / averageValue
  const whole = Math.floor(raw)
  return Math.min(40, whole + (rng.next() < raw - whole ? 1 : 0))
}

function pickCloseHorizon(rng: Rng): number {
  const roll = rng.next()
  let cumulative = 0
  for (const bucket of CLOSE_BUCKETS) {
    cumulative += bucket.weight
    if (roll <= cumulative) return rng.int(bucket.range[0], bucket.range[1])
  }
  return rng.int(30, 90)
}

function pickStageForHorizon(days: number, rng: Rng): Stage {
  const entry =
    STAGE_BY_HORIZON.find((candidate) => days <= candidate.maxDays) ??
    STAGE_BY_HORIZON[STAGE_BY_HORIZON.length - 1]
  const roll = rng.next()
  let cumulative = 0
  for (const option of entry.mix) {
    cumulative += option.weight
    if (roll <= cumulative) return option.stage
  }
  return entry.mix[entry.mix.length - 1].stage
}

function pickOwner(owners: OwnerProfile[], rng: Rng, strengthTotal: number): OwnerProfile {
  const roll = rng.next() * strengthTotal
  let cumulative = 0
  for (const owner of owners) {
    cumulative += owner.strength
    if (roll <= cumulative) return owner
  }
  return owners[owners.length - 1]
}

function randomDateInMonth(
  rng: Rng,
  monthStart: Date,
  monthEnd: Date,
  cap: Date | null,
): Date | null {
  const upper = cap ? Math.min(cap.getTime(), monthEnd.getTime()) : monthEnd.getTime()
  if (upper <= monthStart.getTime()) return null
  return new Date(monthStart.getTime() + rng.next() * (upper - monthStart.getTime()))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
