import { describe, expect, it } from 'vitest'
import { parseHeights } from '../../src/harness/heightsParam'

describe('parseHeights', () => {
  it('reads variable', () => {
    expect(parseHeights('variable')).toBe('variable')
  })

  it('falls back to fixed for anything else', () => {
    expect(parseHeights(null)).toBe('fixed')
    expect(parseHeights('fixed')).toBe('fixed')
    expect(parseHeights('Variable')).toBe('fixed')
    expect(parseHeights('')).toBe('fixed')
  })
})
