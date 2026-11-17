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
  if (model.count === 0 || viewportHeight <= 0) {
    return { start: -1, end: -1, offsetTop: 0, totalHeight }
  }
  // Clamp so overscrolling (e.g. iOS bounce) never produces an empty range.
  const top = Math.min(Math.max(0, scrollTop), Math.max(0, totalHeight - viewportHeight))
  const first = model.indexAt(top)
  const last = model.indexAt(top + viewportHeight - 1)
  const start = Math.max(0, first - Math.max(0, overscan.before))
  const end = Math.min(model.count - 1, last + Math.max(0, overscan.after))
  return { start, end, offsetTop: model.offsetOf(start), totalHeight }
}
