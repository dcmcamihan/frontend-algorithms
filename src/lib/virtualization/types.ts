/** The slice of rows to render, plus what the spacer needs. */
export type VisibleRange = {
  /** First index to render, overscan included. -1 when the list is empty. */
  start: number
  /** Last index to render, inclusive. -1 when the list is empty. */
  end: number
  /** Pixel offset of row `start` from the top of the list. */
  offsetTop: number
  /** Full list height, for the scroll spacer. */
  totalHeight: number
}

/** Maps between row indexes and pixel positions. */
export interface HeightModel {
  readonly count: number
  totalHeight(): number
  /** Top edge of row `index`, in px. */
  offsetOf(index: number): number
  /** Index of the row containing pixel `y` (clamped to the list). */
  indexAt(y: number): number
}

export type Overscan = { before: number; after: number }

/** Decides how many extra rows to render around the visible ones. */
export interface OverscanStrategy {
  readonly name: string
  compute(input: { velocityPxPerMs: number; avgRowHeight: number }): Overscan
}
