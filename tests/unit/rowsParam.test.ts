import { describe, expect, it } from 'vitest'
import { DEFAULT_ROWS, parseRows } from '../../src/harness/rowsParam'

describe('parseRows', () => {
  it('reads whole numbers of 1 or more', () => {
    expect(parseRows('10000')).toBe(10_000)
    expect(parseRows('1')).toBe(1)
  })

  it('falls back to the default when the value is missing or empty', () => {
    expect(parseRows(null)).toBe(DEFAULT_ROWS)
    expect(parseRows('')).toBe(DEFAULT_ROWS)
  })

  it('falls back to the default for zero, negative and fractional values', () => {
    expect(parseRows('0')).toBe(DEFAULT_ROWS)
    expect(parseRows('-1')).toBe(DEFAULT_ROWS)
    expect(parseRows('1.5')).toBe(DEFAULT_ROWS)
  })

  it('falls back to the default for text and non-finite values', () => {
    expect(parseRows('abc')).toBe(DEFAULT_ROWS)
    expect(parseRows('NaN')).toBe(DEFAULT_ROWS)
    expect(parseRows('Infinity')).toBe(DEFAULT_ROWS)
    expect(parseRows('1e400')).toBe(DEFAULT_ROWS)
  })
})
