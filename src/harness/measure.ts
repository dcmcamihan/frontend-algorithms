/**
 * First-paint timing used by the harness.
 * main.tsx marks 'mount-start' just before React renders; the harness
 * calls afterPaint() once mounted, which waits two frames so the browser
 * has actually painted before the measurement is taken.
 */
export function afterPaint(): Promise<number> {
  return new Promise((resolve) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        performance.mark('first-paint-done')
        const m = performance.measure('initial-render', 'mount-start', 'first-paint-done')
        resolve(m.duration)
      }),
    ),
  )
}

export function domNodeCount(root: Element | null): number {
  return root ? root.querySelectorAll('*').length + 1 : 0
}

export type HarnessResult = {
  mode: 'virtual' | 'plain'
  rows: number
  /** Overscan strategy name, virtual mode only. */
  overscan?: string
  /** Row heights: all 48 px, or seeded 24 to 72 px. Missing in results saved before variable heights existed. */
  heights?: 'fixed' | 'variable'
  initialRenderMs: number
  domNodes: number
  renderedRows: number
  jsHeapMB?: number
}

declare global {
  interface Window {
    __bench?: HarnessResult
  }
}
