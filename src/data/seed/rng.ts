/**
 * Deterministic pseudo-random helpers.
 *
 * The whole simulated dataset is derived from a single seed, so the same
 * workspace always produces the same commercial history. Nothing in the app
 * ever calls Math.random for business data.
 */

/** xmur3 string hash, used to turn a workspace into a stable numeric seed. */
export function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next: () => number
  /** Uniform float in [min, max). */
  float: (min: number, max: number) => number
  /** Uniform integer in [min, max] inclusive. */
  int: (min: number, max: number) => number
  /** Picks one element. */
  pick: <T>(items: readonly T[]) => T
  /** True with the given probability. */
  chance: (probability: number) => boolean
  /** Roughly normal value around `mean`, clamped to [min, max]. */
  around: (mean: number, spread: number, min?: number, max?: number) => number
  /** Fisher-Yates shuffle on a copy. */
  shuffle: <T>(items: readonly T[]) => T[]
}

/** mulberry32 - small, fast, good enough for plausible business data. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const float = (min: number, max: number) => min + next() * (max - min)
  const int = (min: number, max: number) => Math.floor(float(min, max + 1))

  return {
    next,
    float,
    int,
    pick: <T,>(items: readonly T[]) => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
    around: (mean, spread, min = -Infinity, max = Infinity) => {
      // Sum of three uniforms gives a cheap bell curve.
      const bell = (next() + next() + next()) / 3
      const value = mean + (bell - 0.5) * 2 * spread
      return Math.min(max, Math.max(min, value))
    },
    shuffle: <T,>(items: readonly T[]) => {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}

/** Rounds to a value a sales team would actually write down. */
export function roundDealValue(value: number): number {
  if (value >= 250_000) return Math.round(value / 5000) * 5000
  if (value >= 50_000) return Math.round(value / 1000) * 1000
  if (value >= 10_000) return Math.round(value / 500) * 500
  return Math.max(500, Math.round(value / 100) * 100)
}
