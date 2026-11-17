/**
 * Seeded pseudo-random generator (mulberry32).
 * Same seed, same sequence: every benchmark dataset is reproducible.
 * Not suitable for security.
 */
export type Random = {
  /** Float in [0, 1). */
  next: () => number
  /** Integer in [min, max], inclusive. */
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
}

export function createRandom(seed: number): Random {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
  }
}
