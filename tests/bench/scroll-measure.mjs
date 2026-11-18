/**
 * Scroll benchmark for the virtualization engine.
 *
 * Usage:
 *   npm run build && npx vite preview --port 4174
 *   npm run bench:scroll -- [--runs 5] [--strategies static-5,static-20,velocity] [--base URL]
 *   npm run bench:scroll -- --estimate     (print the planned run time and exit)
 *
 * Runs in headed Google Chrome (Playwright channel "chrome"). Set CHROME_PATH to use another
 * Chrome binary. Keep the window visible and the machine idle while it runs.
 * The first run of every scenario is a warm-up and is discarded.
 * Writes src/bench/results/virtualization-scroll.json
 */
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import os from 'node:os'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}

const base = flag('base', 'http://localhost:4174')
const runs = Number(flag('runs', 5))
const strategies = flag('strategies', 'static-5,static-20,velocity').split(',')
const durationMs = Number(flag('duration', 3000))
const datasets = [10_000, 100_000]
const speeds = [
  { name: 'slow', pxPerSec: 600 },
  { name: 'medium', pxPerSec: 3000 },
  { name: 'fling', pxPerSec: 12000 },
  // Static-5 keeps 240 px ready ahead (5 rows x 48 px). Rendered rows trail the scroll by one
  // to two frames, so on a 120 Hz display static-5 can start to fall behind somewhere between
  // about 14,400 and 28,800 px/s. These two speeds are above that range on purpose.
  { name: 'fast-fling', pxPerSec: 30000 },
  { name: 'max-fling', pxPerSec: 60000 },
]
const START_FRACTION = 0.1
const VIEWPORT = { width: 1280, height: 900 }
// Frame timing in headless mode is not representative, so this benchmark runs headed.
const HEADLESS = false
// Rough cost of one run besides the scroll itself: page load, idle settle, cleanup.
// The real elapsed time is printed at the end and saved in the JSON.
const EST_OVERHEAD_MS = 1500

if (!Number.isInteger(runs) || runs < 2) throw new Error('--runs must be 2 or more (1 is warm-up)')
for (const s of strategies) {
  if (!/^(static-\d{1,3}|velocity)$/.test(s)) throw new Error(`unknown strategy "${s}"`)
}

const scenarios = []
for (const rows of datasets)
  for (const strategy of strategies)
    for (const speed of speeds) scenarios.push({ rows, strategy, speed })

const totalRuns = scenarios.length * runs
const estimateMin = (totalRuns * (durationMs + EST_OVERHEAD_MS)) / 60000
console.log(
  `${scenarios.length} scenarios x ${runs} runs (1 warm-up) = ${totalRuns} page loads, ` +
    `about ${estimateMin.toFixed(1)} min`,
)
if (args.includes('--estimate')) process.exit(0)

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function machineInfo() {
  const isMac = process.platform === 'darwin'
  const batt = isMac ? sh('pmset -g batt') : null
  const lowPower = isMac ? sh('pmset -g | grep -i lowpowermode') : null
  return {
    os: isMac
      ? `macOS ${sh('sw_vers -productVersion') ?? os.release()}`
      : `${os.type()} ${os.release()}`,
    model: isMac ? sh('sysctl -n hw.model') : null,
    cpu:
      (isMac ? sh('sysctl -n machdep.cpu.brand_string') : null) ?? os.cpus()[0]?.model ?? 'unknown',
    cores: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 2 ** 30),
    power: batt ? (/'([^']+)'/.exec(batt)?.[1] ?? batt.split('\n')[0]) : 'unknown',
    battery: batt ? (/(\d+%)/.exec(batt)?.[1] ?? null) : null,
    lowPowerMode: lowPower ? lowPower.trim().endsWith('1') : null,
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const p95 = (xs) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)]
const round = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d

const metricValue = (m, name) => m.metrics.find((x) => x.name === name)?.value ?? 0

async function runOnce(browser, sc) {
  const page = await browser.newPage({ viewport: VIEWPORT })
  try {
    await page.goto(`${base}/?mode=virtual&rows=${sc.rows}&overscan=${sc.strategy}&bench=scroll`)
    await page.waitForFunction(() => window.__bench && window.__scrollBench, null, {
      timeout: 60_000,
    })
    const loaded = await page.evaluate(() => window.__bench.overscan)
    const expected =
      sc.strategy === 'velocity' ? loaded?.startsWith('velocity-') : loaded === sc.strategy
    if (!expected) throw new Error(`page used ${loaded}, expected ${sc.strategy}`)

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    const before = await cdp.send('Performance.getMetrics')
    const r = await page.evaluate((opts) => window.__scrollBench(opts), {
      speedPxPerSec: sc.speed.pxPerSec,
      durationMs,
      startFraction: START_FRACTION,
    })
    const after = await cdp.send('Performance.getMetrics')
    const perSec = (name) =>
      ((metricValue(after, name) - metricValue(before, name)) * 1000) / (r.durationMs / 1000)
    return {
      ...r,
      strategyDetail: loaded,
      blankFramePct: (r.blankFrames / r.frames) * 100,
      droppedFramePct: (r.droppedFrames / Math.max(1, r.frames - 1)) * 100,
      scriptMsPerSec: perSec('ScriptDuration'),
      taskMsPerSec: perSec('TaskDuration'),
    }
  } finally {
    await page.close()
  }
}

const METRICS = {
  fps: 'fps',
  droppedFramePct: '%',
  worstFrameMs: 'ms',
  blankFramePct: '%',
  maxBlankPx: 'px',
  meanBlankPx: 'px',
  meanRenderedRows: 'rows',
  longTasks: 'count',
  longTaskMs: 'ms',
  scriptMsPerSec: 'ms per s',
  taskMsPerSec: 'ms per s',
}

const browser = await chromium.launch({
  channel: process.env.CHROME_PATH ? undefined : 'chrome',
  executablePath: process.env.CHROME_PATH || undefined,
  headless: HEADLESS,
  args: [
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling',
  ],
})

const started = Date.now()
const samples = new Map(scenarios.map((sc) => [sc, []]))
let done = 0
// Interleave: every scenario once per round, so slow drift affects all of them equally.
for (let round_ = 0; round_ < runs; round_++) {
  for (const sc of scenarios) {
    const r = await runOnce(browser, sc)
    if (round_ > 0) samples.get(sc).push(r)
    done++
    process.stdout.write(`\r${done}/${totalRuns} runs`)
  }
}
process.stdout.write('\n')
const elapsedMin = (Date.now() - started) / 60000

const results = scenarios.map((sc) => {
  const xs = samples.get(sc)
  const metrics = {}
  for (const [k, unit] of Object.entries(METRICS)) {
    const v = xs.map((s) => s[k])
    metrics[k] = { median: round(median(v)), p95: round(p95(v)), unit }
  }
  return {
    strategy: sc.strategy,
    strategyDetail: xs[0].strategyDetail,
    dataset: `rows-fixed-${sc.rows}`,
    speed: sc.speed.name,
    targetPxPerSec: sc.speed.pxPerSec,
    stepPxPerFrame: median(xs.map((s) => s.stepPx)),
    refreshMs: round(median(xs.map((s) => s.refreshMs)), 2),
    framesPerRun: median(xs.map((s) => s.frames)),
    runs: xs.length,
    metrics,
  }
})

const output = {
  benchmark: 'virtualization-scroll',
  seed: 20261117,
  environment: {
    browser: `Google Chrome ${browser.version()} (${HEADLESS ? 'headless' : 'headed'})`,
    ...machineInfo(),
    build: 'production (vite preview)',
    date: new Date().toISOString(),
    elapsedMin: round(elapsedMin),
  },
  method: {
    scroll:
      'scrollTop moved by a fixed px step every animation frame. Wheel and trackpad input were not simulated.',
    speeds: 'synthetic target speeds set in code, not measured from real trackpad or wheel flings',
    stepFromSpeed: 'step = target px/s x idle frame interval, measured once per run',
    blankFrame:
      'more than 1 px of the viewport not covered by a rendered row, checked right after the frame scroll position is set. Compositor blank areas are not visible to this check.',
    droppedFrame: 'frame interval above 1.5 x the idle frame interval',
    cpu: 'Chrome DevTools Protocol ScriptDuration and TaskDuration over the whole run, per second of scrolling',
    statistic: 'median and p95 across runs. With few runs, p95 is the worst run.',
    runsPerScenario: runs - 1,
    warmupRunsDiscarded: 1,
    order: 'interleaved rounds',
    durationMs,
    startFraction: START_FRACTION,
    viewport: VIEWPORT,
    listHeightPx: 480,
  },
  results,
}
await browser.close()

writeFileSync(
  'src/bench/results/virtualization-scroll.json',
  JSON.stringify(output, null, 2) + '\n',
)
console.log(
  `Done in ${elapsedMin.toFixed(1)} min. Written to src/bench/results/virtualization-scroll.json`,
)
console.table(
  results.map((r) => ({
    strategy: r.strategy,
    rows: r.dataset.replace('rows-fixed-', ''),
    speed: r.speed,
    fps: r.metrics.fps.median,
    'dropped %': r.metrics.droppedFramePct.median,
    'blank %': r.metrics.blankFramePct.median,
    'max blank px': r.metrics.maxBlankPx.median,
    rows_in_dom: r.metrics.meanRenderedRows.median,
    long_tasks: r.metrics.longTasks.median,
    'task ms/s': r.metrics.taskMsPerSec.median,
  })),
)
