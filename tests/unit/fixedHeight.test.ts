import { describe, expect, it } from 'vitest'
import { computeRange, fixedHeightModel, staticOverscan } from '../../src/lib'

const none = { before: 0, after: 0 }

describe('fixedHeightModel', () => {
  it('maps pixels to rows', () => {
    const m = fixedHeightModel(100, 50)
    expect(m.totalHeight()).toBe(5000)
    expect(m.offsetOf(3)).toBe(150)
    expect(m.indexAt(0)).toBe(0)
    expect(m.indexAt(49)).toBe(0)
    expect(m.indexAt(50)).toBe(1)
    expect(m.indexAt(-10)).toBe(0)
    expect(m.indexAt(999_999)).toBe(99)
  })

  it('rejects invalid input', () => {
    expect(() => fixedHeightModel(10, 0)).toThrow(RangeError)
    expect(() => fixedHeightModel(-1, 10)).toThrow(RangeError)
    expect(() => fixedHeightModel(1.5, 10)).toThrow(RangeError)
  })
})

describe('computeRange with fixed heights', () => {
  const m = fixedHeightModel(1000, 50) // 50,000 px tall

  it('covers exactly the visible rows at the top', () => {
    expect(computeRange(m, 0, 500, none)).toEqual({
      start: 0,
      end: 9,
      offsetTop: 0,
      totalHeight: 50_000,
    })
  })

  it('includes a partly visible row', () => {
    const r = computeRange(m, 25, 500, none)
    expect(r.start).toBe(0)
    expect(r.end).toBe(10)
  })

  it('works in the middle', () => {
    const r = computeRange(m, 25_000, 500, none)
    expect(r).toMatchObject({ start: 500, end: 509, offsetTop: 25_000 })
  })

  it('clamps at the end, including overscroll', () => {
    const r = computeRange(m, 60_000, 500, none)
    expect(r.end).toBe(999)
    expect(r.start).toBe(990)
  })

  it('adds overscan and clamps it at both ends', () => {
    const o = staticOverscan(5).compute({ velocityPxPerMs: 0, avgRowHeight: 50 })
    expect(computeRange(m, 0, 500, o)).toMatchObject({ start: 0, end: 14 })
    expect(computeRange(m, 25_000, 500, o)).toMatchObject({
      start: 495,
      end: 514,
      offsetTop: 24_750,
    })
    expect(computeRange(m, 49_500, 500, o)).toMatchObject({ start: 985, end: 999 })
  })

  it('handles a viewport taller than the list', () => {
    const small = fixedHeightModel(3, 50)
    expect(computeRange(small, 0, 500, none)).toMatchObject({ start: 0, end: 2 })
  })

  it('returns an empty range for an empty list or zero viewport', () => {
    expect(computeRange(fixedHeightModel(0, 50), 0, 500, none)).toMatchObject({
      start: -1,
      end: -1,
    })
    expect(computeRange(m, 0, 0, none)).toMatchObject({ start: -1, end: -1 })
  })

  it('always covers every row that is on screen (property check)', () => {
    for (let top = 0; top < 50_000; top += 137) {
      const r = computeRange(m, top, 480, none)
      const firstVisible = Math.floor(top / 50)
      const lastVisible = Math.floor((Math.min(top, 50_000 - 480) + 479) / 50)
      expect(r.start).toBeLessThanOrEqual(firstVisible)
      expect(r.end).toBeGreaterThanOrEqual(Math.min(999, lastVisible))
    }
  })
})
