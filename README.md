# Frontend Algorithms

A TypeScript library of front-end performance algorithms, with a demo harness, unit tests and
reproducible benchmarks. The library code is framework-free; React components are thin adapters
on top, so the algorithms can be reused in any project.

## What's inside

| Area | Purpose | Status |
| --- | --- | --- |
| Virtualization | Render only the rows near the viewport, so very long lists stay fast | Fixed-height rows and static overscan |
| Layout optimization | Compute card and widget placement (masonry, packing, priority) on top of CSS Grid and Flexbox | Not started |
| Cache and prefetch | Client-side caching with LRU, TTL, stale-while-revalidate, deduplication and prefetching | Not started |

## Getting started

```bash
npm install
npm run dev      # demo harness at http://localhost:5173
npm test         # unit tests (Vitest)
npm run lint
npm run build
```

## Benchmarks

Benchmarks run against a production build in Chromium via Playwright.

```bash
npx playwright install chromium   # once
npm run build && npx vite preview --port 4174
npm run bench:first               # in a second terminal
```

Results are written to `src/bench/results/` as JSON. Every dataset is generated from a fixed seed,
so runs can be reproduced.

## Usage

```ts
import { computeRange, fixedHeightModel, staticOverscan } from './src/lib'

const model = fixedHeightModel(100_000, 48)
const overscan = staticOverscan(5).compute({ velocityPxPerMs: 0, avgRowHeight: 48 })
const range = computeRange(model, scrollTop, viewportHeight, overscan)
// render rows range.start..range.end, each at top = model.offsetOf(i)
```

For React, use `VirtualList` from `src/react/VirtualList.tsx`.

## Project structure

```text
src/lib/          the library: no DOM or React. Public API in src/lib/index.ts
  shared/         seeded random generator
  virtualization/ height models, range calculation, overscan strategies
  layout/         layout optimization
  cache/          cache and prefetch
src/react/        React adapters
src/bench/        seeded datasets and benchmark results
src/harness/      demo and measurement app
tests/unit/       unit tests
tests/bench/      benchmark scripts
```
