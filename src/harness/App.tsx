import { useCallback, useEffect, useMemo, useState } from 'react'
import { fixedHeightModel } from '../lib'
import { FIXED_ROW_HEIGHT, rowLabel } from '../bench/datasets/rows'
import { VirtualList } from '../react/VirtualList'
import { afterPaint, domNodeCount } from './measure'
import { DEFAULT_OVERSCAN, parseOverscan } from './overscanParam'
import { installScrollBench } from './scrollBench'
import type { HarnessResult } from './measure'
import type { VisibleRange } from '../lib'

const VIEWPORT = 480

function readParams() {
  const p = new URLSearchParams(location.search)
  const mode = p.get('mode') === 'plain' ? 'plain' : 'virtual'
  const rows = Number(p.get('rows')) || 100_000
  const overscan = p.get('overscan') ?? DEFAULT_OVERSCAN
  // In the scroll benchmark the live row counter is turned off, because updating it
  // re-renders the whole page on every range change and would add to the measured cost.
  const scrollBench = p.get('bench') === 'scroll'
  return { mode, rows, overscan, scrollBench } as const
}

function Row({ i }: { i: number }) {
  return (
    <div className="row">
      <span className="row-index">{rowLabel(i)}</span>
      <span className="row-meta">Item {i % 97}</span>
    </div>
  )
}

/** Non-virtualized baseline: every row is in the DOM. */
function PlainList({ rows }: { rows: number }) {
  const items = []
  for (let i = 0; i < rows; i++) {
    items.push(
      <li key={i} style={{ height: FIXED_ROW_HEIGHT }}>
        <Row i={i} />
      </li>,
    )
  }
  return (
    <div
      data-testid="plain-list"
      tabIndex={0}
      aria-label="All rows"
      style={{ height: VIEWPORT, overflowY: 'auto' }}
    >
      <ul role="list" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items}
      </ul>
    </div>
  )
}

export default function App() {
  const { mode, rows, overscan: overscanParam, scrollBench } = useMemo(() => readParams(), [])
  const overscan = useMemo(() => parseOverscan(overscanParam), [overscanParam])
  const model = useMemo(() => fixedHeightModel(rows, FIXED_ROW_HEIGHT), [rows])
  const [result, setResult] = useState<HarnessResult | null>(null)
  const [rendered, setRendered] = useState(0)
  const onRangeChange = useCallback((r: VisibleRange) => setRendered(r.end - r.start + 1), [])

  useEffect(() => {
    afterPaint().then((ms) => {
      const list = document.querySelector('[data-testid$="-list"]')
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      const r: HarnessResult = {
        mode,
        rows,
        overscan: mode === 'virtual' ? overscan.name : undefined,
        initialRenderMs: Math.round(ms * 10) / 10,
        domNodes: domNodeCount(list),
        renderedRows: list ? list.querySelectorAll('li').length : 0,
        jsHeapMB: mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : undefined,
      }
      window.__bench = r
      setResult(r)
    })
  }, [mode, rows, overscan])

  useEffect(() => {
    if (mode !== 'virtual') return
    return installScrollBench(() => document.querySelector('[data-testid="virtual-list"]'))
  }, [mode])

  const link = (m: string, n: number, o = DEFAULT_OVERSCAN) =>
    m === 'plain' ? `?mode=${m}&rows=${n}` : `?mode=${m}&rows=${n}&overscan=${o}`

  return (
    <main className="harness">
      <h1>Virtualization Lab</h1>
      <p className="lead">
        Fixed-height rows ({FIXED_ROW_HEIGHT}px). Overscan strategy: {overscan.name}. Each link
        reloads the page so timing starts clean.
      </p>
      <nav aria-label="Scenarios" className="scenarios">
        <a href={link('virtual', 10_000)}>Virtual 10k</a>
        <a href={link('virtual', 100_000)}>Virtual 100k</a>
        <a href={link('virtual', 100_000, 'static-20')}>Virtual 100k, overscan 20</a>
        <a href={link('plain', 10_000)}>Plain 10k (baseline)</a>
      </nav>
      <p className="note">
        1M rows is left out on purpose: 1,000,000 × 48px is 48 million px, above the browser's
        maximum element height. Scaling for 1M rows is not supported yet.
      </p>

      <section className="stats" aria-live="polite">
        <div>
          <b>Mode</b> {mode}
        </div>
        <div>
          <b>Rows</b> {rows.toLocaleString('en-US')}
        </div>
        <div>
          <b>Initial render</b> {result ? `${result.initialRenderMs} ms` : '…'}
        </div>
        <div>
          <b>DOM nodes in list</b> {result?.domNodes.toLocaleString('en-US') ?? '…'}
        </div>
        <div>
          <b>Rows in DOM now</b>{' '}
          {mode !== 'virtual'
            ? rows.toLocaleString('en-US')
            : scrollBench
              ? 'off during scroll test'
              : rendered}
        </div>
        {result?.jsHeapMB !== undefined && (
          <div>
            <b>JS heap</b> {result.jsHeapMB} MB
          </div>
        )}
      </section>

      {mode === 'virtual' ? (
        <VirtualList
          label={`${rows.toLocaleString('en-US')} rows`}
          model={model}
          overscan={overscan}
          height={VIEWPORT}
          renderRow={(i) => <Row i={i} />}
          onRangeChange={scrollBench ? undefined : onRangeChange}
        />
      ) : (
        <PlainList rows={rows} />
      )}
    </main>
  )
}
