import { describe, expect, it } from 'vitest'
import { computeRange, fixedHeightModel, velocityOverscan } from '../../src/lib'

const at = (velocityPxPerMs: number, avgRowHeight = 48) => ({ velocityPxPerMs, avgRowHeight })

describe('velocityOverscan', () => {
  it('behaves like static-5 when the list is still', () => {
    expect(velocityOverscan().compute(at(0))).toEqual({ before: 5, after: 5 })
  })

  it('adds rows only ahead when scrolling down', () => {
    // 3 px/ms x 32 ms = 96 px = 2 rows of 48 px, on top of base 5
    expect(velocityOverscan().compute(at(3))).toEqual({ before: 5, after: 7 })
  })

  it('adds rows only ahead when scrolling up', () => {
    expect(velocityOverscan().compute(at(-3))).toEqual({ before: 7, after: 5 })
  })

  it('rounds partial rows up so the lookahead distance is fully covered', () => {
    // 1 px/ms x 32 ms = 32 px, less than one row, still one extra row
    expect(velocityOverscan().compute(at(1)).after).toBe(6)
  })

  it('grows with speed and stops at max', () => {
    const s = velocityOverscan()
    expect(s.compute(at(30)).after).toBe(25) // 960 px = 20 rows + 5
    expect(s.compute(at(60)).after).toBe(45) // 1920 px = 40 rows + 5
    expect(s.compute(at(500)).after).toBe(60)
    expect(s.compute(at(-500)).before).toBe(60)
  })

  it('uses base when velocity or row height is not usable', () => {
    const s = velocityOverscan()
    expect(s.compute(at(NaN))).toEqual({ before: 5, after: 5 })
    expect(s.compute(at(Infinity))).toEqual({ before: 5, after: 5 })
    expect(s.compute(at(10, 0))).toEqual({ before: 5, after: 5 })
    expect(s.compute(at(10, NaN))).toEqual({ before: 5, after: 5 })
  })

  it('accepts custom settings', () => {
    const s = velocityOverscan({ base: 2, lookaheadMs: 100, max: 10 })
    expect(s.compute(at(0))).toEqual({ before: 2, after: 2 })
    expect(s.compute(at(1))).toEqual({ before: 2, after: 5 }) // 100 px = 3 rows
    expect(s.compute(at(10)).after).toBe(10)
    expect(s.name).toBe('velocity-2-100ms-max10')
  })

  it('names the default settings', () => {
    expect(velocityOverscan().name).toBe('velocity-5-32ms-max60')
  })

  it('rejects invalid settings', () => {
    expect(() => velocityOverscan({ base: -1 })).toThrow(RangeError)
    expect(() => velocityOverscan({ base: NaN })).toThrow(RangeError)
    expect(() => velocityOverscan({ lookaheadMs: Infinity })).toThrow(RangeError)
    expect(() => velocityOverscan({ max: -2 })).toThrow(RangeError)
    expect(() => velocityOverscan({ base: 10, max: 5 })).toThrow(RangeError)
  })

  it('gives computeRange a range that leads in the direction of travel', () => {
    const model = fixedHeightModel(10_000, 48)
    const down = computeRange(model, 48_000, 480, velocityOverscan().compute(at(30)))
    // visible rows 1000..1009, 5 behind, 25 ahead
    expect(down.start).toBe(995)
    expect(down.end).toBe(1034)
    const up = computeRange(model, 48_000, 480, velocityOverscan().compute(at(-30)))
    expect(up.start).toBe(975)
    expect(up.end).toBe(1014)
  })

  it('never goes past the ends of the list', () => {
    const model = fixedHeightModel(100, 48)
    const r = computeRange(model, 0, 480, velocityOverscan().compute(at(-500)))
    expect(r.start).toBe(0)
    const end = computeRange(model, 99_999, 480, velocityOverscan().compute(at(500)))
    expect(end.end).toBe(99)
  })
})
