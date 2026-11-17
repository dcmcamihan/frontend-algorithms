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
