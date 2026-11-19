export const DEFAULT_ROWS = 100_000

/**
 * Turn the Lab's `?rows=` value into a row count.
 * Accepted: a whole number of 1 or more, for example `10000`.
 * Anything else (missing, 0, negative, fractional, text, Infinity) falls back to 100,000,
 * so a typo never breaks the page.
 */
export function parseRows(value: string | null): number {
  const n = Number(value)
  return Number.isSafeInteger(n) && n >= 1 ? n : DEFAULT_ROWS
}
