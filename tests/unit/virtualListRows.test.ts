import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { fixedHeightModel, staticOverscan, variableHeightModel } from '../../src/lib'
import type { HeightModel } from '../../src/lib'
import { VirtualList } from '../../src/react/VirtualList'

/** First render of the list (scrolled to the top), as row tops and heights read from the markup. */
function renderRows(model: HeightModel, viewport = 100) {
  const html = renderToStaticMarkup(
    createElement(VirtualList, {
      model,
      overscan: staticOverscan(0),
      height: viewport,
      label: 'rows',
      renderRow: (i: number) => `row ${i}`,
    }),
  )
  const rows = [...html.matchAll(/<li [^>]*style="([^"]*)"/g)].map((m) => m[1])
  return rows.map((style) => ({
    // React writes 0 without a unit, so px is optional.
    top: Number(/top:(\d+(?:\.\d+)?)(?:px)?/.exec(style)?.[1]),
    height: Number(/height:(\d+(?:\.\d+)?)(?:px)?/.exec(style)?.[1]),
    hidden: style.includes('overflow:hidden'),
  }))
}

describe('VirtualList row placement', () => {
  it('places variable-height rows at their offsets with their own heights', () => {
    const rows = renderRows(variableHeightModel([30, 50, 20, 40]), 100)
    expect(rows).toEqual([
      { top: 0, height: 30, hidden: true },
      { top: 30, height: 50, hidden: true },
      { top: 80, height: 20, hidden: true },
    ])
  })

  it('gives a zero-height row an explicit height of 0, so its content cannot spill', () => {
    // Row 1 has height 0 and sits between rows 0 and 2, so it is inside the rendered range.
    const rows = renderRows(variableHeightModel([40, 0, 40, 40]), 100)
    expect(rows).toHaveLength(4)
    expect(rows[1]).toEqual({ top: 40, height: 0, hidden: true })
    expect(rows[2].top).toBe(40)
  })

  it('places fixed-height rows exactly as before', () => {
    const rows = renderRows(fixedHeightModel(100, 48), 100)
    expect(rows.map((r) => r.top)).toEqual([0, 48, 96])
    expect(rows.every((r) => r.height === 48)).toBe(true)
  })
})
