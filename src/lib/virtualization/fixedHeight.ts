import type { HeightModel } from './types'

/** All rows share one height: every lookup is O(1). */
export function fixedHeightModel(count: number, rowHeight: number): HeightModel {
  if (!(rowHeight > 0)) throw new RangeError('rowHeight must be greater than 0')
  if (count < 0 || !Number.isInteger(count))
    throw new RangeError('count must be a non-negative integer')
  return {
    count,
    totalHeight: () => count * rowHeight,
    offsetOf: (index) => index * rowHeight,
    indexAt: (y) => Math.min(count - 1, Math.max(0, Math.floor(y / rowHeight))),
  }
}
