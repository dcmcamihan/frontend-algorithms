export type HeightsMode = 'fixed' | 'variable'

/**
 * Turn the Lab's `?heights=` value into a mode.
 * Accepted: `variable` (seeded heights of 24 to 72 px). Anything else is `fixed` (all 48 px),
 * so a typo never breaks the page.
 */
export function parseHeights(value: string | null): HeightsMode {
  return value === 'variable' ? 'variable' : 'fixed'
}
