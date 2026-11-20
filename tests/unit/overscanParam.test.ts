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

  it('reads pixel overscan', () => {
    expect(parseOverscan('pixels').name).toBe('pixels-240')
    expect(parseOverscan('pixels-100').name).toBe('pixels-100')
    expect(parseOverscan('pixels-0').name).toBe('pixels-0')
  })

  it('falls back to static-5 for missing or unknown values', () => {
    expect(parseOverscan(null).name).toBe('static-5')
    expect(parseOverscan('').name).toBe('static-5')
    expect(parseOverscan('static-').name).toBe('static-5')
    expect(parseOverscan('Velocity').name).toBe('static-5')
    expect(parseOverscan('static-5000').name).toBe('static-5')
    expect(parseOverscan('pixels-').name).toBe('static-5')
    expect(parseOverscan('pixels-12345').name).toBe('static-5')
    expect(parseOverscan('pixels--5').name).toBe('static-5')
  })
})
