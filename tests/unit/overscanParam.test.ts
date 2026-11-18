import { describe, expect, it } from 'vitest'
import { parseOverscan } from '../../src/harness/overscanParam'

describe('parseOverscan', () => {
  it('reads static-N', () => {
    expect(parseOverscan('static-20').name).toBe('static-20')
    expect(parseOverscan('static-0').name).toBe('static-0')
  })

  it('reads velocity with its default settings', () => {
    expect(parseOverscan('velocity').name).toBe('velocity-5-32ms-max60')
  })

  it('falls back to static-5 for missing or unknown values', () => {
    expect(parseOverscan(null).name).toBe('static-5')
    expect(parseOverscan('').name).toBe('static-5')
    expect(parseOverscan('static-').name).toBe('static-5')
    expect(parseOverscan('Velocity').name).toBe('static-5')
    expect(parseOverscan('static-5000').name).toBe('static-5')
  })
})
