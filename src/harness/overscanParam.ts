import { pixelOverscan, staticOverscan, velocityOverscan } from '../lib'
import type { OverscanStrategy } from '../lib'

export const DEFAULT_OVERSCAN = 'static-5'

/**
 * Turn the Lab's `?overscan=` value into a strategy.
 * Accepted: `static-<rows>`, for example `static-5` or `static-20`, and `velocity`
 * (velocity-aware overscan with its default settings), `pixels-<px>` such as `pixels-240`,
 * and `pixels` (240 px).
 * Anything else falls back to static-5, so a typo never breaks the page.
 */
export function parseOverscan(value: string | null): OverscanStrategy {
  if (value === 'velocity') return velocityOverscan()
  if (value === 'pixels') return pixelOverscan()
  const p = /^pixels-(\d{1,4})$/.exec(value ?? '')
  if (p) return pixelOverscan(Number(p[1]))
  const m = /^static-(\d{1,3})$/.exec(value ?? '')
  return staticOverscan(m ? Number(m[1]) : 5)
}
