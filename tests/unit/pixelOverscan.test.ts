import { describe, expect, it } from 'vitest'
import {
  computeRange,
  fixedHeightModel,
  pixelOverscan,
  staticOverscan,
  variableHeightModel,
} from '../../src/lib'
import { rowHeights } from '../../src/bench/datasets/rows'

const still = { velocityPxPerMs: 0, avgRowHeight: 48 }

describe('pixelOverscan', () => {
  it('asks for pixels on both sides', () => {
    expect(pixelOverscan(240).compute(still)).toEqual({ before: 240, after: 240, unit: 'px' })
    expect(pixelOverscan().name).toBe('pixels-240')
    expect(pixelOverscan(100).name).toBe('pixels-100')
  })

  it('does not change with scroll speed', () => {
    const s = pixelOverscan(240)
    expect(s.compute({ velocityPxPerMs: 50, avgRowHeight: 48 })).toEqual(s.compute(still))
  })

  it('accepts 0', () => {
    expect(pixelOverscan(0).compute(still)).toEqual({ before: 0, after: 0, unit: 'px' })
  })

  it('rejects negative and non-finite values', () => {
    for (const bad of [-1, NaN, Infinity, -Infinity]) {
      expect(() => pixelOverscan(bad)).toThrow(RangeError)
    }
  })
})

describe('computeRange with pixel overscan', () => {
  it('renders the same rows as static overscan when every row is 48 px', () => {
    const model = fixedHeightModel(1_000, 48)
    const viewport = 480
    const px = pixelOverscan(5 * 48).compute(still)
    const rows = staticOverscan(5).compute(still)
    // Whole-row positions, mid-row positions, the top, the bottom and past both ends.
    for (const top of [
      -50, 0, 1, 47, 48, 100, 239, 240, 241, 1_000, 1_010, 20_000, 47_519, 47_520, 99_999,
    ]) {
      expect(computeRange(model, top, viewport, px)).toEqual(
        computeRange(model, top, viewport, rows),
      )
    }
  })

  it('covers the asked distance above and below with variable heights', () => {
    const heights = rowHeights(2_000, 'variable')
    const model = variableHeightModel(heights)
    const viewport = 480
    const px = 240
    const total = model.totalHeight()
    for (let top = 0; top <= total; top += 997) {
      const r = computeRange(model, top, viewport, pixelOverscan(px).compute(still))
      const safeTop = Math.min(top, total - viewport)
      expect(model.offsetOf(r.start)).toBeLessThanOrEqual(Math.max(0, safeTop - px))
      expect(model.offsetOf(r.end + 1)).toBeGreaterThanOrEqual(
        Math.min(total, safeTop + viewport + px),
      )
    }
  })

  it('keeps short rows from covering less height than tall rows', () => {
    // 100 short rows then 100 tall rows. Static 5 rows covers 50 px or 500 px depending on where it is.
    const model = variableHeightModel(200, (i) => (i < 100 ? 10 : 100))
    const rows = computeRange(model, 500, 200, staticOverscan(5).compute(still))
    const px = computeRange(model, 500, 200, pixelOverscan(250).compute(still))
    // Static 5 rows ahead ends well short of 250 px beyond the viewport. Pixel overscan does not.
    expect(model.offsetOf(rows.end + 1)).toBeLessThan(500 + 200 + 250)
    expect(model.offsetOf(px.end + 1)).toBeGreaterThanOrEqual(500 + 200 + 250)
  })

  it('clamps at the top and the bottom of the list', () => {
    const model = variableHeightModel([30, 40, 50, 60, 70])
    const total = model.totalHeight()
    const top = computeRange(model, 0, 60, { before: 1_000, after: 1_000, unit: 'px' })
    expect(top.start).toBe(0)
    expect(top.end).toBe(4)
    const bottom = computeRange(model, total, 60, { before: 0, after: 1_000, unit: 'px' })
    expect(bottom.end).toBe(4)
  })

  it('treats 0 px as just the visible rows', () => {
    const model = fixedHeightModel(100, 50)
    const r = computeRange(model, 500, 100, { before: 0, after: 0, unit: 'px' })
    expect(r.start).toBe(10)
    expect(r.end).toBe(11)
  })

  it('ignores negative and non-finite pixel values like rows do', () => {
    const model = fixedHeightModel(100, 50)
    const base = computeRange(model, 500, 100, { before: 0, after: 0, unit: 'px' })
    for (const bad of [-5, NaN, Infinity]) {
      expect(computeRange(model, 500, 100, { before: bad, after: bad, unit: 'px' })).toEqual(base)
    }
  })

  it('keeps fractions of a pixel, so a partial row is still reached', () => {
    const model = fixedHeightModel(100, 50)
    // viewport ends at y 599. 0.5 px lower is still row 11. 50.5 px lower reaches row 12.
    expect(computeRange(model, 500, 100, { before: 0, after: 50.5, unit: 'px' }).end).toBe(12)
  })

  it('does not change what row-based overscan returns', () => {
    const model = fixedHeightModel(100, 50)
    expect(computeRange(model, 500, 100, { before: 2, after: 3 })).toEqual(
      computeRange(model, 500, 100, { before: 2, after: 3, unit: 'rows' }),
    )
  })
})
