/**
 * Pure helpers for the scroll benchmark. No DOM access here, so they can be unit tested.
 */

/** A vertical span in px, top inclusive, bottom exclusive. */
export type Span = { top: number; bottom: number }

/**
 * How many px of the window [top, bottom) are not covered by any span.
 * Spans may overlap, be unsorted, or fall partly outside the window.
 */
export function uncoveredPx(spans: readonly Span[], top: number, bottom: number): number {
  if (!(bottom > top)) return 0
  const clipped = spans
    .map((s) => ({ top: Math.max(s.top, top), bottom: Math.min(s.bottom, bottom) }))
    .filter((s) => s.bottom > s.top)
    .sort((a, b) => a.top - b.top)
  let covered = 0
  let reach = top
  for (const s of clipped) {
    if (s.bottom <= reach) continue
    covered += s.bottom - Math.max(s.top, reach)
    reach = s.bottom
  }
  return bottom - top - covered
}

export type FrameSummary = {
  /** Frames per second over the run. */
  fps: number
  /** Number of frame intervals. */
  intervals: number
  /** Intervals longer than 1.5 times the display refresh interval. */
  droppedFrames: number
  /** Longest single interval, ms. */
  worstIntervalMs: number
}

/**
 * Summarize requestAnimationFrame timestamps (ms, increasing).
 * `refreshMs` is the display's normal frame interval, measured while idle.
 */
export function summarizeFrames(timestamps: readonly number[], refreshMs: number): FrameSummary {
  if (timestamps.length < 2 || !(refreshMs > 0)) {
    return { fps: 0, intervals: 0, droppedFrames: 0, worstIntervalMs: 0 }
  }
  let dropped = 0
  let worst = 0
  for (let i = 1; i < timestamps.length; i++) {
    const d = timestamps[i] - timestamps[i - 1]
    if (d > refreshMs * 1.5) dropped++
    if (d > worst) worst = d
  }
  const intervals = timestamps.length - 1
  const elapsed = timestamps[timestamps.length - 1] - timestamps[0]
  return {
    fps: elapsed > 0 ? (intervals * 1000) / elapsed : 0,
    intervals,
    droppedFrames: dropped,
    worstIntervalMs: worst,
  }
}

/** Median of a list of numbers. NaN for an empty list. */
export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
