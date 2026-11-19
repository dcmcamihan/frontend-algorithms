import { describe, expect, it } from 'vitest'
import {
  FIXED_ROW_HEIGHT,
  rowHeights,
  VARIABLE_MAX,
  VARIABLE_MIN,
} from '../../src/bench/datasets/rows'

describe('rowHeights dataset', () => {
  it('fixed mode is all the same height', () => {
    const h = rowHeights(1000, 'fixed')
    expect(h.every((x) => x === FIXED_ROW_HEIGHT)).toBe(true)
  })

  it('variable mode is reproducible and in range', () => {
    const a = rowHeights(10_000, 'variable', 99)
    const b = rowHeights(10_000, 'variable', 99)
    expect(a).toEqual(b)
    expect(Math.min(...a)).toBeGreaterThanOrEqual(VARIABLE_MIN)
    expect(Math.max(...a)).toBeLessThanOrEqual(VARIABLE_MAX)
  })

  it('variable mode averages about the fixed height', () => {
    const h = rowHeights(100_000, 'variable')
    const mean = h.reduce((sum, x) => sum + x, 0) / h.length
    expect(Math.abs(mean - FIXED_ROW_HEIGHT)).toBeLessThan(0.5)
    expect(h.every((x) => Number.isInteger(x))).toBe(true)
  })

  it('builds a million rows as a compact typed array', () => {
    const h = rowHeights(1_000_000, 'variable')
    expect(h.length).toBe(1_000_000)
    expect(h.byteLength).toBe(4_000_000)
  })
})
