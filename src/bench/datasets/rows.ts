import { createRandom } from '../../lib/shared/random'

export const ROW_SCALES = [10_000, 100_000, 1_000_000] as const
export const FIXED_ROW_HEIGHT = 48
export const VARIABLE_MIN = 32
export const VARIABLE_MAX = 200
export const DEFAULT_SEED = 20261117

export type RowMode = 'fixed' | 'variable'

/**
 * Row heights only, as a typed array, so a million rows stays near 4 MB
 * and generating the data does not dominate memory measurements.
 */
export function rowHeights(count: number, mode: RowMode, seed = DEFAULT_SEED): Float32Array {
  const heights = new Float32Array(count)
  if (mode === 'fixed') return heights.fill(FIXED_ROW_HEIGHT)
  const rand = createRandom(seed)
  for (let i = 0; i < count; i++) heights[i] = rand.int(VARIABLE_MIN, VARIABLE_MAX)
  return heights
}

/** Deterministic label for row i, so rendered content is stable between runs. */
export const rowLabel = (i: number) => `Row ${(i + 1).toLocaleString('en-US')}`
