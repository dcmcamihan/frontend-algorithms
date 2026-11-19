import { describe, expect, it } from 'vitest'
import {
  computeRange,
  createRandom,
  fixedHeightModel,
  staticOverscan,
  variableHeightModel,
} from '../../src/lib'

const none = { before: 0, after: 0 }

describe('variableHeightModel', () => {
  it('maps pixels to rows', () => {
    const m = variableHeightModel([10, 20, 30, 40])
    expect(m.count).toBe(4)
    expect(m.totalHeight()).toBe(100)
    expect([0, 1, 2, 3, 4].map((i) => m.offsetOf(i))).toEqual([0, 10, 30, 60, 100])
    expect(m.indexAt(0)).toBe(0)
    expect(m.indexAt(9.9)).toBe(0)
    expect(m.indexAt(10)).toBe(1)
    expect(m.indexAt(29)).toBe(1)
    expect(m.indexAt(30)).toBe(2)
    expect(m.indexAt(60)).toBe(3)
    expect(m.indexAt(99)).toBe(3)
  })

  it('accepts a count and a height function', () => {
    const fromArray = variableHeightModel([5, 15, 25])
    const fromFn = variableHeightModel(3, (i) => 5 + i * 10)
    expect(fromFn.totalHeight()).toBe(fromArray.totalHeight())
    for (let y = 0; y < 45; y++) expect(fromFn.indexAt(y)).toBe(fromArray.indexAt(y))
  })

  it('handles an empty list', () => {
    const m = variableHeightModel([])
    expect(m.count).toBe(0)
    expect(m.totalHeight()).toBe(0)
    expect(m.offsetOf(0)).toBe(0)
    expect(m.indexAt(0)).toBe(-1)
    expect(computeRange(m, 0, 480, none)).toMatchObject({ start: -1, end: -1 })
  })

  it('handles a single row', () => {
    const m = variableHeightModel([48])
    expect(m.indexAt(0)).toBe(0)
    expect(m.indexAt(47)).toBe(0)
    expect(m.indexAt(500)).toBe(0)
    expect(computeRange(m, 0, 480, none)).toMatchObject({ start: 0, end: 0, totalHeight: 48 })
  })

  it('skips zero-height rows, which never contain a pixel', () => {
    const m = variableHeightModel([0, 10, 0, 0, 10, 0])
    expect(m.totalHeight()).toBe(20)
    expect(m.indexAt(0)).toBe(1)
    expect(m.indexAt(9)).toBe(1)
    expect(m.indexAt(10)).toBe(4)
    expect(m.indexAt(19)).toBe(4)
  })

  it('clamps positions before the first row and past the end', () => {
    const m = variableHeightModel([10, 20, 30])
    expect(m.indexAt(-50)).toBe(0)
    expect(m.indexAt(60)).toBe(2)
    expect(m.indexAt(1_000_000)).toBe(2)
    expect(m.offsetOf(-3)).toBe(0)
    expect(m.offsetOf(99)).toBe(60)
  })

  it('clamps infinite input to the ends and treats NaN as the top', () => {
    const m = variableHeightModel([10, 20, 30])
    expect(m.indexAt(-Infinity)).toBe(0)
    expect(m.indexAt(Infinity)).toBe(2)
    expect(m.indexAt(NaN)).toBe(0)
    expect(m.offsetOf(-Infinity)).toBe(0)
    expect(m.offsetOf(Infinity)).toBe(60)
    expect(m.offsetOf(NaN)).toBe(0)
  })

  it('floors fractional indexes like row numbers', () => {
    const m = variableHeightModel([10, 20, 30])
    expect(m.offsetOf(1.9)).toBe(10)
    expect(m.offsetOf(2.5)).toBe(30)
  })

  it('reads heights once, so later changes to the array have no effect', () => {
    const heights = [10, 20, 30]
    const m = variableHeightModel(heights)
    heights[0] = 500
    expect(m.totalHeight()).toBe(60)
    expect(m.offsetOf(1)).toBe(10)
  })

  it('rejects invalid heights and counts', () => {
    expect(() => variableHeightModel([10, -1])).toThrow(RangeError)
    expect(() => variableHeightModel([10, NaN])).toThrow(RangeError)
    expect(() => variableHeightModel([Infinity])).toThrow(RangeError)
    expect(() => variableHeightModel(3, () => -5)).toThrow(RangeError)
    expect(() => variableHeightModel(-1, () => 10)).toThrow(RangeError)
    expect(() => variableHeightModel(1.5, () => 10)).toThrow(RangeError)
    expect(() => variableHeightModel(NaN, () => 10)).toThrow(RangeError)
    expect(() => variableHeightModel([10, undefined as unknown as number])).toThrow(RangeError)
  })

  it('requires a height function when given a count', () => {
    // @ts-expect-error: a count needs a height function
    expect(() => variableHeightModel(3)).toThrow(TypeError)
  })

  it('does not call the height function for an empty list', () => {
    let calls = 0
    variableHeightModel(0, () => {
      calls++
      return 10
    })
    expect(calls).toBe(0)
  })

  it('names the bad row in the error', () => {
    expect(() => variableHeightModel([10, 20, -3])).toThrow('row 2')
  })
})

describe('variableHeightModel matches fixedHeightModel when every height is the same', () => {
  const fixed = fixedHeightModel(1000, 48)
  const variable = variableHeightModel(new Array(1000).fill(48))

  it('gives the same offsets, indexes and total height', () => {
    expect(variable.totalHeight()).toBe(fixed.totalHeight())
    for (let i = 0; i < 1000; i += 7) expect(variable.offsetOf(i)).toBe(fixed.offsetOf(i))
    for (let y = -100; y < 48_100; y += 13) expect(variable.indexAt(y)).toBe(fixed.indexAt(y))
  })

  it('gives the same ranges from computeRange, with and without overscan', () => {
    const o = staticOverscan(5).compute({ velocityPxPerMs: 0, avgRowHeight: 48 })
    for (let top = 0; top < 48_000; top += 211) {
      expect(computeRange(variable, top, 480, none)).toEqual(computeRange(fixed, top, 480, none))
      expect(computeRange(variable, top, 480, o)).toEqual(computeRange(fixed, top, 480, o))
    }
  })
})

describe('computeRange with variable heights', () => {
  const random = createRandom(20261118)
  const heights = Array.from({ length: 10_000 }, () => random.int(24, 72))
  const m = variableHeightModel(heights)

  it('always covers every row that is on screen (property check)', () => {
    const total = m.totalHeight()
    for (let top = 0; top < total; top += 997) {
      const r = computeRange(m, top, 480, none)
      const viewTop = Math.min(top, total - 480)
      expect(m.offsetOf(r.start)).toBeLessThanOrEqual(viewTop)
      expect(m.offsetOf(r.end + 1)).toBeGreaterThanOrEqual(viewTop + 480)
      expect(r.offsetTop).toBe(m.offsetOf(r.start))
    }
  })
})
