import { staticOverscan } from '../lib'
import type { OverscanStrategy } from '../lib'

export const DEFAULT_OVERSCAN = 'static-5'

/**
 * Turn the Lab's `?overscan=` value into a strategy.
 * Accepted: `static-<rows>`, for example `static-5` or `static-20`.
 * Anything else falls back to static-5, so a typo never breaks the page.
 */
export function parseOverscan(value: string | null): OverscanStrategy {
  const m = /^static-(\d{1,3})$/.exec(value ?? '')
  return staticOverscan(m ? Number(m[1]) : 5)
}
