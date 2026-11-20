import type { OverscanStrategy } from './types'

/** Baseline: the same number of extra rows on both sides, whatever the scroll speed. */
export function staticOverscan(rows = 5): OverscanStrategy {
  if (!Number.isFinite(rows) || rows < 0) {
    throw new RangeError('overscan rows must be a finite number of 0 or more')
  }
  const n = Math.floor(rows)
  return {
    name: `static-${n}`,
    compute: () => ({ before: n, after: n }),
  }
}

/**
 * Cover a fixed distance in pixels on each side, whatever the row heights are.
 * `staticOverscan` counts rows, so with variable heights five short rows cover less than five
 * tall ones. With fixed heights, `pixelOverscan(rows * rowHeight)` renders the same rows as
 * `staticOverscan(rows)`.
 */
export function pixelOverscan(px = 240): OverscanStrategy {
  if (!Number.isFinite(px) || px < 0) {
    throw new RangeError('overscan px must be a finite number of 0 or more')
  }
  return {
    name: `pixels-${px}`,
    compute: () => ({ before: px, after: px, unit: 'px' }),
  }
}

export type VelocityOverscanOptions = {
  /** Rows on each side when the list is still, and on the trailing side while scrolling. */
  base?: number
  /** How far ahead to cover, as ms of travel at the current speed. */
  lookaheadMs?: number
  /** Most rows on the leading side, whatever the speed. */
  max?: number
}

export const VELOCITY_OVERSCAN_DEFAULTS = { base: 5, lookaheadMs: 32, max: 60 } as const

/**
 * Velocity-aware, directional overscan. At rest it behaves like `staticOverscan(base)`.
 * While scrolling it adds enough rows ahead to cover `lookaheadMs` of travel at the current
 * speed, only in the direction of travel, capped at `max`. The trailing side keeps `base`.
 * Positive velocity means scrolling down (scrollTop increasing).
 */
export function velocityOverscan(options: VelocityOverscanOptions = {}): OverscanStrategy {
  const { base, lookaheadMs, max } = { ...VELOCITY_OVERSCAN_DEFAULTS, ...options }
  for (const [name, value] of Object.entries({ base, lookaheadMs, max })) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a finite number of 0 or more`)
    }
  }
  if (max < base) throw new RangeError('max must be at least base')
  const b = Math.floor(base)
  const m = Math.floor(max)
  return {
    name: `velocity-${b}-${lookaheadMs}ms-max${m}`,
    compute: ({ velocityPxPerMs, avgRowHeight }) => {
      const v = Number.isFinite(velocityPxPerMs) ? velocityPxPerMs : 0
      if (v === 0 || !Number.isFinite(avgRowHeight) || avgRowHeight <= 0) {
        return { before: b, after: b }
      }
      const extra = Math.ceil((Math.abs(v) * lookaheadMs) / avgRowHeight)
      const ahead = Math.min(m, b + extra)
      return v > 0 ? { before: b, after: ahead } : { before: ahead, after: b }
    },
  }
}
