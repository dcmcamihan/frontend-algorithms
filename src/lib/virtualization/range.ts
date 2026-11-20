import type { HeightModel, Overscan, VisibleRange } from './types'

/**
 * Rows that should exist in the DOM for this scroll position.
 * Works with any HeightModel; cost is whatever `indexAt` costs.
 */
export function computeRange(
  model: HeightModel,
  scrollTop: number,
  viewportHeight: number,
  overscan: Overscan,
): VisibleRange {
  const totalHeight = model.totalHeight()
  // Non-finite input (NaN, Infinity) is treated as "nothing to show yet" rather than
  // producing NaN indexes. This can happen before a container has been measured.
  if (model.count === 0 || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return { start: -1, end: -1, offsetTop: 0, totalHeight }
  }
  // Clamp so overscrolling (e.g. iOS bounce) never produces an empty range.
  const safeTop = Number.isFinite(scrollTop) ? scrollTop : 0
  const top = Math.min(Math.max(0, safeTop), Math.max(0, totalHeight - viewportHeight))
  let start: number
  let end: number
  if (overscan.unit === 'px') {
    // Pixel overscan: cover a distance, however many rows that takes.
    start = model.indexAt(top - safeCount(overscan.before, false))
    end = model.indexAt(top + viewportHeight - 1 + safeCount(overscan.after, false))
  } else {
    start = Math.max(0, model.indexAt(top) - safeCount(overscan.before))
    end = Math.min(
      model.count - 1,
      model.indexAt(top + viewportHeight - 1) + safeCount(overscan.after),
    )
  }
  return { start, end, offsetTop: model.offsetOf(start), totalHeight }
}

/**
 * Overscan from a custom strategy may be anything. Rows are kept to a whole number of 0 or
 * more. Pixels keep their fractions, because a part of a pixel can still decide which row is hit.
 */
function safeCount(n: number, whole = true): number {
  if (!Number.isFinite(n) || n <= 0) return 0
  return whole ? Math.floor(n) : n
}
