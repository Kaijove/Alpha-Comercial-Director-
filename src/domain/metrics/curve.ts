/**
 * Piecewise-linear scoring curve.
 *
 * Every engine in the product that turns a raw ratio into a 0-100 score does it
 * through this function and an explicit table of points, rather than through a
 * magic formula. A director can read the table and see exactly where the
 * thresholds are; a developer changing policy edits data, not arithmetic.
 */
export type CurvePoint = [input: number, score: number]

/** Score when the input is unknown: deliberately neutral, never optimistic. */
export const NEUTRAL_SCORE = 55

export function interpolate(points: CurvePoint[], value: number | null): number {
  if (value === null || !Number.isFinite(value)) return NEUTRAL_SCORE

  const sorted = [...points].sort((a, b) => a[0] - b[0])
  if (value <= sorted[0][0]) return sorted[0][1]
  if (value >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1]

  for (let i = 1; i < sorted.length; i += 1) {
    const [x1, y1] = sorted[i - 1]
    const [x2, y2] = sorted[i]
    if (value <= x2) {
      const span = x2 - x1
      const position = span === 0 ? 0 : (value - x1) / span
      return y1 + (y2 - y1) * position
    }
  }

  return sorted[sorted.length - 1][1]
}

/** Clamps to the 0-100 band every score in the product uses. */
export const clamp100 = (value: number): number => Math.max(0, Math.min(100, value))
