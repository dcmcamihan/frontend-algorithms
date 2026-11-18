import { describe, expect, it } from 'vitest'
import { createVelocityTracker } from '../../src/lib'

describe('createVelocityTracker', () => {
  it('starts at 0 and needs two samples for a speed', () => {
    const t = createVelocityTracker()
    expect(t.velocity).toBe(0)
    expect(t.update(0, 0)).toBe(0)
    expect(t.update(100, 10)).toBe(10)
  })

  it('is positive scrolling down and negative scrolling up', () => {
    const down = createVelocityTracker()
    down.update(1000, 0)
    expect(down.update(1050, 10)).toBe(5)
    const up = createVelocityTracker()
    up.update(1000, 0)
    expect(up.update(950, 10)).toBe(-5)
  })

  it('settles on a steady speed', () => {
    const t = createVelocityTracker()
    for (let i = 0; i <= 20; i++) t.update(i * 25, i * 8.33)
    expect(t.velocity).toBeCloseTo(25 / 8.33, 5)
  })

  it('smooths a single uneven sample', () => {
    const t = createVelocityTracker({ smoothing: 0.5 })
    t.update(0, 0)
    t.update(100, 10) // 10 px/ms
    expect(t.update(400, 20)).toBe(20) // sample 30, half weight: 0.5 x 30 + 0.5 x 10
  })

  it('starts over after a pause longer than idleResetMs', () => {
    const t = createVelocityTracker({ idleResetMs: 100 })
    t.update(0, 0)
    t.update(100, 10)
    expect(t.update(5000, 500)).toBe(0)
    expect(t.update(5010, 510)).toBe(1)
  })

  it('keeps the estimate when two samples share a timestamp', () => {
    const t = createVelocityTracker()
    t.update(0, 0)
    t.update(100, 10)
    expect(t.update(150, 10)).toBe(10)
    expect(t.update(250, 20)).toBe(10) // (250 - 150) / 10 = 10, smoothed with 10
  })

  it('ignores non-finite input', () => {
    const t = createVelocityTracker()
    t.update(0, 0)
    t.update(100, 10)
    expect(t.update(NaN, 20)).toBe(10)
    expect(t.update(200, Infinity)).toBe(10)
  })

  it('reset returns to 0', () => {
    const t = createVelocityTracker()
    t.update(0, 0)
    t.update(100, 10)
    t.reset()
    expect(t.velocity).toBe(0)
    expect(t.update(200, 20)).toBe(0)
  })

  it('rejects invalid options', () => {
    expect(() => createVelocityTracker({ smoothing: 0 })).toThrow(RangeError)
    expect(() => createVelocityTracker({ smoothing: 1.5 })).toThrow(RangeError)
    expect(() => createVelocityTracker({ smoothing: NaN })).toThrow(RangeError)
    expect(() => createVelocityTracker({ idleResetMs: 0 })).toThrow(RangeError)
    expect(() => createVelocityTracker({ idleResetMs: Infinity })).toThrow(RangeError)
  })
})
