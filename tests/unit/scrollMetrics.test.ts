import { describe, expect, it } from 'vitest'
import { median, summarizeFrames, uncoveredPx } from '../../src/bench/scrollMetrics'

describe('uncoveredPx', () => {
  it('is 0 when rows cover the whole window', () => {
    const spans = [
      { top: 0, bottom: 48 },
      { top: 48, bottom: 96 },
      { top: 96, bottom: 144 },
    ]
    expect(uncoveredPx(spans, 10, 140)).toBe(0)
  })

  it('counts a gap between rows', () => {
    const spans = [
      { top: 0, bottom: 48 },
      { top: 96, bottom: 144 },
    ]
    expect(uncoveredPx(spans, 0, 144)).toBe(48)
  })

  it('counts blank space above and below the rendered rows', () => {
    expect(uncoveredPx([{ top: 100, bottom: 300 }], 0, 480)).toBe(280)
  })

  it('is the whole window when nothing is rendered', () => {
    expect(uncoveredPx([], 0, 480)).toBe(480)
  })

  it('handles overlapping and unsorted spans without double counting', () => {
    const spans = [
      { top: 50, bottom: 150 },
      { top: 0, bottom: 100 },
      { top: 60, bottom: 70 },
    ]
    expect(uncoveredPx(spans, 0, 200)).toBe(50)
  })

  it('ignores spans outside the window', () => {
    const spans = [
      { top: -200, bottom: -100 },
      { top: 500, bottom: 600 },
    ]
    expect(uncoveredPx(spans, 0, 480)).toBe(480)
  })

  it('returns 0 for an empty or inverted window', () => {
    expect(uncoveredPx([], 100, 100)).toBe(0)
    expect(uncoveredPx([], 100, 50)).toBe(0)
  })
})

describe('summarizeFrames', () => {
  it('reports steady 60 fps with no dropped frames', () => {
    const ts = Array.from({ length: 61 }, (_, i) => i * (1000 / 60))
    const s = summarizeFrames(ts, 1000 / 60)
    expect(s.fps).toBeCloseTo(60, 5)
    expect(s.intervals).toBe(60)
    expect(s.droppedFrames).toBe(0)
  })

  it('counts an interval above 1.5 refresh intervals as dropped', () => {
    const ts = [0, 16.7, 33.3, 83.3, 100]
    const s = summarizeFrames(ts, 16.7)
    expect(s.droppedFrames).toBe(1)
    expect(s.worstIntervalMs).toBeCloseTo(50, 5)
    expect(s.fps).toBeCloseTo(40, 5)
  })

  it('does not count a slightly late frame as dropped', () => {
    expect(summarizeFrames([0, 16.7, 40], 16.7).droppedFrames).toBe(0)
  })

  it('returns zeros for too few timestamps or a bad refresh interval', () => {
    expect(summarizeFrames([5], 16.7).fps).toBe(0)
    expect(summarizeFrames([0, 16.7], 0).intervals).toBe(0)
    expect(summarizeFrames([0, 16.7], NaN).intervals).toBe(0)
  })
})

describe('median', () => {
  it('handles odd and even lengths without changing the input', () => {
    const xs = [3, 1, 2]
    expect(median(xs)).toBe(2)
    expect(xs).toEqual([3, 1, 2])
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('is NaN for an empty list', () => {
    expect(median([])).toBeNaN()
  })
})
