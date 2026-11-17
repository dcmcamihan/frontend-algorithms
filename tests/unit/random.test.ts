import { describe, expect, it } from 'vitest'
import { createRandom } from '../../src/lib/shared/random'

describe('createRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    const seqA = Array.from({ length: 100 }, () => a.next())
    const seqB = Array.from({ length: 100 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('gives different sequences for different seeds', () => {
    const a = createRandom(1)
    const b = createRandom(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('stays in [0, 1) and int stays inside its bounds', () => {
    const r = createRandom(7)
    for (let i = 0; i < 10_000; i++) {
      const x = r.next()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
      const n = r.int(32, 200)
      expect(n).toBeGreaterThanOrEqual(32)
      expect(n).toBeLessThanOrEqual(200)
      expect(Number.isInteger(n)).toBe(true)
    }
  })
})
