import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, UIEvent } from 'react'
import { computeRange } from '../lib/virtualization/range'
import { createVelocityTracker } from '../lib/virtualization/velocity'
import type { HeightModel, OverscanStrategy, VisibleRange } from '../lib/virtualization/types'

type Props = {
  model: HeightModel
  overscan: OverscanStrategy
  /** Visible height of the scroll container, px. */
  height: number
  renderRow: (index: number) => ReactNode
  label: string
  onRangeChange?: (range: VisibleRange) => void
}

/** After this long without a scroll event, velocity drops back to 0. */
const SCROLL_IDLE_MS = 150

/**
 * Thin React adapter: all range math lives in the library.
 * Rows are absolutely positioned inside a spacer of the full list height.
 * Scroll velocity is measured here and passed to the overscan strategy.
 */
export function VirtualList({ model, overscan, height, renderRow, label, onRangeChange }: Props) {
  const [scroll, setScroll] = useState({ top: 0, velocity: 0 })
  const frame = useRef<number | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tracker] = useState(() => createVelocityTracker())
  const avgRowHeight = model.count > 0 ? model.totalHeight() / model.count : 0

  const range = useMemo(() => {
    const o = overscan.compute({ velocityPxPerMs: scroll.velocity, avgRowHeight })
    return computeRange(model, scroll.top, height, o)
  }, [model, overscan, scroll, height, avgRowHeight])

  // Report the range after commit, never during render.
  useEffect(() => {
    onRangeChange?.(range)
  }, [range, onRangeChange])

  // Cancel a pending frame or idle timer if the list unmounts mid-scroll.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      if (idleTimer.current !== null) clearTimeout(idleTimer.current)
    },
    [],
  )

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const top = e.currentTarget.scrollTop
    const velocity = tracker.update(top, performance.now())
    // One state update per animation frame, however many scroll events fire.
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setScroll({ top, velocity })
    })
    // When scrolling stops, drop back to velocity 0 so extra rows are released.
    if (idleTimer.current !== null) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      idleTimer.current = null
      tracker.reset()
      setScroll((s) => (s.velocity === 0 ? s : { top: s.top, velocity: 0 }))
    }, SCROLL_IDLE_MS)
  }

  const rows: ReactNode[] = []
  for (let i = range.start; i >= 0 && i <= range.end; i++) {
    rows.push(
      <li
        key={i}
        aria-setsize={model.count}
        aria-posinset={i + 1}
        style={{
          position: 'absolute',
          top: model.offsetOf(i),
          left: 0,
          right: 0,
          height: model.offsetOf(i + 1) - model.offsetOf(i) || undefined,
        }}
      >
        {renderRow(i)}
      </li>,
    )
  }

  return (
    <div
      data-testid="virtual-list"
      tabIndex={0}
      aria-label={label}
      onScroll={onScroll}
      style={{ height, overflowY: 'auto', position: 'relative', contain: 'strict' }}
    >
      <ul
        role="list"
        style={{
          position: 'relative',
          height: range.totalHeight,
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {rows}
      </ul>
    </div>
  )
}
