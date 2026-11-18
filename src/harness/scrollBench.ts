/**
 * In-page scroll driver for tests/bench/scroll-measure.mjs.
 *
 * It scrolls the list by a fixed number of px every animation frame by setting `scrollTop`.
 * Wheel and trackpad input are not simulated. Right after each new position is set, it checks
 * which part of the viewport is covered by rendered rows. That is the state the browser paints
 * in the same frame, so an uncovered strip is a blank area the user would see.
 * It cannot see blank areas created by the browser's own compositor.
 */
import { median, summarizeFrames, uncoveredPx } from '../bench/scrollMetrics'
import type { Span } from '../bench/scrollMetrics'

export type ScrollRunOptions = {
  /** Target speed. Converted once to a fixed step per frame from the measured refresh rate. */
  speedPxPerSec: number
  /** How long to scroll, ms. */
  durationMs: number
  /** Start position as a fraction of the scrollable distance. Default 0.1. */
  startFraction?: number
}

export type ScrollRunResult = {
  speedPxPerSec: number
  /** Display frame interval measured while idle, ms. */
  refreshMs: number
  /** Fixed scroll step per frame, px. */
  stepPx: number
  scrolledPx: number
  durationMs: number
  frames: number
  fps: number
  droppedFrames: number
  worstFrameMs: number
  /** Frames where more than 1 px of the viewport had no row. */
  blankFrames: number
  maxBlankPx: number
  meanBlankPx: number
  meanRenderedRows: number
  longTasks: number
  longTaskMs: number
}

const IDLE_FRAMES = 20
const BLANK_TOLERANCE_PX = 1

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function viewportCoverage(el: HTMLElement): { blankPx: number; rows: number } {
  const box = el.getBoundingClientRect()
  const top = box.top + el.clientTop
  const bottom = top + el.clientHeight
  const items = el.querySelectorAll('li')
  const spans: Span[] = []
  for (const li of items) {
    const r = li.getBoundingClientRect()
    spans.push({ top: r.top, bottom: r.bottom })
  }
  return { blankPx: uncoveredPx(spans, top, bottom), rows: items.length }
}

export async function runScroll(el: HTMLElement, opts: ScrollRunOptions): Promise<ScrollRunResult> {
  const maxTop = el.scrollHeight - el.clientHeight
  const start = Math.round(maxTop * (opts.startFraction ?? 0.1))
  el.scrollTop = start

  // Let the list settle at the start position and measure the display's frame interval.
  const idle: number[] = []
  for (let i = 0; i < IDLE_FRAMES; i++) idle.push(await nextFrame())
  const refreshMs = median(idle.slice(1).map((t, i) => t - idle[i]))
  const stepPx = Math.max(1, Math.round((opts.speedPxPerSec * refreshMs) / 1000))

  const longTasks: PerformanceEntry[] = []
  const observer = PerformanceObserver.supportedEntryTypes.includes('longtask')
    ? new PerformanceObserver((list) => longTasks.push(...list.getEntries()))
    : null
  observer?.observe({ type: 'longtask' })

  const stamps: number[] = []
  let blankFrames = 0
  let maxBlank = 0
  let sumBlank = 0
  let sumRows = 0
  let position = start
  const t0 = await nextFrame()
  for (let t = t0; ; t = await nextFrame()) {
    stamps.push(t)
    position = Math.min(maxTop, position + stepPx)
    el.scrollTop = position
    const { blankPx, rows } = viewportCoverage(el)
    if (blankPx > BLANK_TOLERANCE_PX) blankFrames++
    if (blankPx > maxBlank) maxBlank = blankPx
    sumBlank += blankPx
    sumRows += rows
    if (t - t0 >= opts.durationMs || position >= maxTop) break
  }
  const tEnd = performance.now()

  // Long task entries arrive after the task ends. Give them time, then collect.
  await wait(150)
  if (observer) {
    longTasks.push(...observer.takeRecords())
    observer.disconnect()
  }
  const inRun = longTasks.filter((e) => e.startTime >= t0 && e.startTime < tEnd)

  const frames = summarizeFrames(stamps, refreshMs)
  const n = stamps.length
  return {
    speedPxPerSec: opts.speedPxPerSec,
    refreshMs,
    stepPx,
    scrolledPx: position - start,
    durationMs: stamps[n - 1] - t0,
    frames: n,
    fps: frames.fps,
    droppedFrames: frames.droppedFrames,
    worstFrameMs: frames.worstIntervalMs,
    blankFrames,
    maxBlankPx: maxBlank,
    meanBlankPx: sumBlank / n,
    meanRenderedRows: sumRows / n,
    longTasks: inRun.length,
    longTaskMs: inRun.reduce((sum, e) => sum + e.duration, 0),
  }
}

declare global {
  interface Window {
    __scrollBench?: (opts: ScrollRunOptions) => Promise<ScrollRunResult>
  }
}

/** Expose the driver for Playwright. Returns a cleanup function. */
export function installScrollBench(getList: () => HTMLElement | null): () => void {
  window.__scrollBench = async (opts) => {
    const el = getList()
    if (!el) throw new Error('virtual list not found')
    return runScroll(el, opts)
  }
  return () => {
    delete window.__scrollBench
  }
}
