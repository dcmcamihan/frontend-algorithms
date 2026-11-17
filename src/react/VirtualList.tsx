import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, UIEvent } from 'react'
import { computeRange } from '../lib/virtualization/range'
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

/**
 * Thin React adapter: all range math lives in the library.
 * Rows are absolutely positioned inside a spacer of the full list height.
 */
export function VirtualList({ model, overscan, height, renderRow, label, onRangeChange }: Props) {
  const [scrollTop, setScrollTop] = useState(0)
  const frame = useRef<number | null>(null)
  const avgRowHeight = model.count > 0 ? model.totalHeight() / model.count : 0

  const range = useMemo(() => {
    const o = overscan.compute({ velocityPxPerMs: 0, avgRowHeight })
    return computeRange(model, scrollTop, height, o)
  }, [model, overscan, scrollTop, height, avgRowHeight])

  // Report the range after commit, never during render.
  useEffect(() => {
    onRangeChange?.(range)
  }, [range, onRangeChange])

  // Cancel a pending frame if the list unmounts mid-scroll.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  function onScroll(e: UIEvent<HTMLDivElement>) {
    const top = e.currentTarget.scrollTop
    // One state update per animation frame, however many scroll events fire.
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      setScrollTop(top)
    })
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
