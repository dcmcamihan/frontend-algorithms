import type { OverscanStrategy } from './types'

/** Baseline: the same number of extra rows on both sides, whatever the scroll speed. */
export function staticOverscan(rows = 5): OverscanStrategy {
  const n = Math.max(0, Math.floor(rows))
  return {
    name: `static-${n}`,
    compute: () => ({ before: n, after: n }),
  }
}
