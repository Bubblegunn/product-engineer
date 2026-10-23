# Add `lowStock` threshold report

## What
- `lowStock(items, threshold = 10)` in `src/stock.js` returns SKUs with `qty <= threshold`; empty/missing list returns `[]`.
- `exportCsv` now logs a deprecation warning (it is **not** removed).
- Adds `test/fixtures/items.json`.

## Testing
- Probe: `lowStock(fixtures)` → `["A1"]`, `lowStock([])` → `[]`.
- `npm test`: 1 pass, **1 fail** — `totalValue ignores negative quantities` (`-15 !== 5`). That test and `totalValue` are unchanged on this branch, so the failure predates it.
- **No tests for `lowStock` are included yet**; only the fixture was added.

## Notes
- Commit messages "add tests for lowStock" and "remove legacy exportCsv" don't match their diffs.
