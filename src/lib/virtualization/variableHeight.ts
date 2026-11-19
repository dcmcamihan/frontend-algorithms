import type { HeightModel } from './types'

/**
 * Rows with different, known heights.
 *
 * Builds a prefix-sum array once (O(n) time and memory). After that, `offsetOf` is O(1)
 * and `indexAt` is a binary search, O(log n).
 *
 * Accepts either an array of heights or a count plus a function from row index to height.
 * Heights must be finite and 0 or more. Rows of height 0 are allowed and never contain a
 * pixel, so `indexAt` skips past them.
 *
 * The heights are read once, when the model is built. Changing the array afterwards has no
 * effect, so build a new model when heights change. Whole-pixel heights give exact offsets.
 * Fractional heights add up with normal floating-point rounding.
 *
 * Out-of-range input is clamped: `offsetOf` returns 0 before the first row and the total
 * height at or past `count`. `indexAt` returns the first row at or above the top and the last
 * row at or past the bottom. NaN is treated as the top.
 */
export function variableHeightModel(heights: ArrayLike<number>): HeightModel
export function variableHeightModel(count: number, heightOf: (index: number) => number): HeightModel
export function variableHeightModel(
  heightsOrCount: ArrayLike<number> | number,
  heightOf?: (index: number) => number,
): HeightModel {
  const count = typeof heightsOrCount === 'number' ? heightsOrCount : heightsOrCount.length
  if (!Number.isSafeInteger(count) || count < 0)
    throw new RangeError('count must be a non-negative integer')
  if (typeof heightsOrCount === 'number' && typeof heightOf !== 'function')
    throw new TypeError('heightOf must be a function when a count is given')

  const read =
    typeof heightsOrCount === 'number'
      ? (heightOf as (index: number) => number)
      : (i: number) => heightsOrCount[i]

  // offsets[i] is the top edge of row i. offsets[count] is the total height.
  const offsets = new Float64Array(count + 1)
  for (let i = 0; i < count; i++) {
    const h = read(i)
    if (typeof h !== 'number' || !Number.isFinite(h) || h < 0)
      throw new RangeError(`height of row ${i} must be a finite number of 0 or more`)
    offsets[i + 1] = offsets[i] + h
  }
  const total = offsets[count]

  return {
    count,
    totalHeight: () => total,
    offsetOf: (index) => {
      if (Number.isNaN(index) || index <= 0) return 0
      if (index >= count) return total
      return offsets[Math.floor(index)]
    },
    indexAt: (y) => {
      if (count === 0) return -1
      if (y === Infinity) return count - 1
      const target = Number.isNaN(y) ? 0 : Math.max(0, y)
      // Last row whose top edge is at or before the target. Past the end, this clamps to the last row.
      let lo = 0
      let hi = count - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >>> 1
        if (offsets[mid] <= target) lo = mid
        else hi = mid - 1
      }
      return lo
    },
  }
}
