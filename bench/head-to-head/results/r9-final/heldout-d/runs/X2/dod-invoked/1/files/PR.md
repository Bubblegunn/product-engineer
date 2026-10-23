# Add `lowStock` threshold report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs with `qty <= threshold`, and `[]` for empty or missing input.

## Also in this branch
- `src/export.js`: `exportCsv` now logs a deprecation warning. Despite the commit title ("remove legacy exportCsv"), it is not removed.
- `test/fixtures/items.json`: new fixture.

## Verification
- Probe: `lowStock(fixtures)` returns `['A1']` and `lowStock([])` returns `[]`.
- `npm test`: 1 passed, 1 failed. `totalValue ignores negative quantities` returns -15 where 5 is expected. That test is unchanged from `main`, so the failure is not caused by this branch.
- No test in this branch calls `lowStock`, despite the commit "add tests for lowStock". The fixture is unused.

## Before merge
- Add `lowStock` tests that use the fixture.
- Fix or triage the failing `totalValue` test.
- Decide whether `exportCsv` should be removed or deprecated, and fix the commit message to match.
