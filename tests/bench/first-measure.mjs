/**
 * First virtualization measurement.
 * Usage: npm run build && npx vite preview --port 4174, then
 *        node tests/bench/first-measure.mjs [baseUrl] [runs] [--heights fixed,variable] [--out path.json]
 * Needs Playwright (npm i -D playwright && npx playwright install chromium).
 * --heights: `fixed` (default) is every row 48 px. `variable` adds virtual lists with seeded
 * heights of 24 to 72 px (mean 48). The plain baseline always uses 48 px rows.
 * Scenarios run in interleaved rounds, so slow drift affects all of them equally.
 * Writes src/bench/results/virtualization-first.json unless --out is given.
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import os from 'node:os'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
// Positional arguments are whatever is not a --flag or a flag's value.
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const base = positional[0] ?? 'http://localhost:4174'
const runs = Number(positional[1] ?? 6) // first run is discarded as warm-up
const heightsModes = flag('heights', 'fixed').split(',')
const outFile = flag('out', 'src/bench/results/virtualization-first.json')
for (const h of heightsModes) {
  if (h !== 'fixed' && h !== 'variable') throw new Error(`unknown heights "${h}"`)
}
if (!Number.isInteger(runs) || runs < 2) throw new Error('runs must be 2 or more (1 is warm-up)')

const scenarios = []
for (const heights of heightsModes) {
  scenarios.push({ mode: 'virtual', rows: 10_000, heights })
  scenarios.push({ mode: 'virtual', rows: 100_000, heights })
}
scenarios.push({ mode: 'plain', rows: 10_000, heights: 'fixed' })

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p95 = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)]

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const results = []
const samplesByScenario = new Map(scenarios.map((sc) => [sc, []]))
for (let i = 0; i < runs; i++) {
  for (const sc of scenarios) {
    const samples = samplesByScenario.get(sc)
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const heightsParam = sc.heights === 'variable' ? '&heights=variable' : ''
    await page.goto(`${base}/?mode=${sc.mode}&rows=${sc.rows}${heightsParam}`)
    await page.waitForFunction(() => window.__bench, null, { timeout: 120_000 })
    const r = await page.evaluate(() => window.__bench)
    // Results saved before variable heights existed have no heights field, so missing means fixed.
    if ((r.heights ?? 'fixed') !== sc.heights)
      throw new Error(`page used ${r.heights} heights, expected ${sc.heights}`)
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
}
for (const sc of scenarios) {
  const samples = samplesByScenario.get(sc)
  const pick = (k) => samples.map((s) => s[k]).filter((v) => typeof v === 'number')
  results.push({
    engine: 'virtualization',
    strategy: sc.mode === 'virtual' ? `${sc.heights}+static-overscan-5` : 'no-virtualization',
    heights: sc.heights,
    dataset: `rows-${sc.heights}-${sc.rows}`,
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
      order: 'interleaved rounds',
    },
  })
}
await browser.close()
writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n')
console.log(`Written to ${outFile}`)
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
