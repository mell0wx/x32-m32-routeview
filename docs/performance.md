# Performance baseline

RouteView runs entirely in the browser, so parse and export speed is part of
the user experience. `src/test/performance.test.ts` measures a generated
full-size scene — 32 inputs with processing and 16 sends each, 16 mix buses,
8 DCAs, 16 output patches, 3 routing blocks, 50 unrecognized lines
(921 lines total) — and asserts every operation stays under a generous
2,000 ms budget. The budgets exist to catch a pathological regression, not
to police a few milliseconds of machine noise; the test logs the actual
timings on every run.

## Baseline (measured 2026-11-05, this project's dev VM, Node 24)

| Operation | Time |
| --- | --- |
| Parse 921-line scene | 9.2 ms |
| Markdown export (processing + sends + raw lines on) | 30.1 ms |
| HTML export | 8.0 ms |
| JSON export | 0.6 ms |
| CSV export | 1.8 ms |
| Volunteer guide build | 13.4 ms |
| Compare two full scenes (2 changes) | 3.1 ms |
| Parse doubled scene (1,842 lines) | 6.7 ms |

The doubled-scene parse coming in faster than the single parse is JIT
warmup, not a measurement error — both are far inside the budget.

## What is not covered

- Render time in the browser (React + charts) is not measured here; the
  numbers above cover parsing, comparing, and exporting only.
- axe-core's color-contrast rule needs real layout, which jsdom does not
  provide, so contrast of the hero text and risk badges is a manual check —
  see `src/test/accessibility.test.tsx`.
