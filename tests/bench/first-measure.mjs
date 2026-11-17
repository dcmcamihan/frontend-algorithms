/**
 * First virtualization measurement.
 * Usage: npm run build && npx vite preview --port 4174, then
 *        node tests/bench/first-measure.mjs [baseUrl] [runs]
 * Needs Playwright (npm i -D playwright && npx playwright install chromium).
 * Writes src/bench/results/virtualization-first.json
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import os from 'node:os'

const base = process.argv[2] ?? 'http://localhost:4174'
const runs = Number(process.argv[3] ?? 6) // first run is discarded as warm-up
const scenarios = [
  { mode: 'virtual', rows: 10_000 },
  { mode: 'virtual', rows: 100_000 },
  { mode: 'plain', rows: 10_000 },
]

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p95 = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)]

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const results = []
for (const sc of scenarios) {
  const samples = []
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await page.goto(`${base}/?mode=${sc.mode}&rows=${sc.rows}`)
    await page.waitForFunction(() => window.__bench, null, { timeout: 120_000 })
    const r = await page.evaluate(() => window.__bench)
    // Scroll check: jump to the middle and confirm the visible rows exist.
    if (sc.mode === 'virtual') {
      const ok = await page.evaluate(async () => {
        const el = document.querySelector('[data-testid="virtual-list"]')
        el.scrollTop = el.scrollHeight / 2
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
        const box = el.getBoundingClientRect()
        const lis = [...el.querySelectorAll('li')].map((li) => li.getBoundingClientRect())
        // every pixel row of the viewport is covered by some rendered li
        for (let y = box.top + 1; y < box.bottom - 1; y += 4) {
          if (!lis.some((b) => b.top <= y && b.bottom > y)) return false
        }
        return true
      })
      r.midScrollCovered = ok
    }
    if (i > 0) samples.push(r)
    await page.close()
  }
  const pick = (k) => samples.map((s) => s[k]).filter((v) => typeof v === 'number')
  results.push({
    engine: 'virtualization',
    strategy: sc.mode === 'virtual' ? 'fixed+static-overscan-5' : 'no-virtualization',
    dataset: `rows-fixed-${sc.rows}`,
    seed: 20261117,
    runs: samples.length,
    metrics: {
      initialRenderMs: {
        median: median(pick('initialRenderMs')),
        p95: p95(pick('initialRenderMs')),
        unit: 'ms',
      },
      domNodes: { median: median(pick('domNodes')), p95: p95(pick('domNodes')), unit: 'nodes' },
      jsHeapMB: pick('jsHeapMB').length
        ? { median: median(pick('jsHeapMB')), p95: p95(pick('jsHeapMB')), unit: 'MB' }
        : undefined,
    },
    checks:
      sc.mode === 'virtual'
        ? { midScrollCovered: samples.every((s) => s.midScrollCovered) }
        : undefined,
    environment: {
      browser: `Chromium ${browser.version()} (headless)`,
      os: `${os.type()} ${os.release()}`,
      cpu: `${os.cpus()[0]?.model ?? 'unknown'} x${os.cpus().length}`,
      date: new Date().toISOString(),
      build: 'production',
    },
  })
}
await browser.close()
writeFileSync(
  'src/bench/results/virtualization-first.json',
  JSON.stringify(results, null, 2) + '\n',
)
console.table(
  results.map((r) => ({
    strategy: r.strategy,
    dataset: r.dataset,
    renderMs: r.metrics.initialRenderMs.median,
    domNodes: r.metrics.domNodes.median,
    heapMB: r.metrics.jsHeapMB?.median,
    covered: r.checks?.midScrollCovered,
  })),
)
