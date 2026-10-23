# Add lowStock threshold report

## What
- `lowStock(items, threshold = 10)` in `src/stock.js`: returns SKUs with `qty <= threshold`; empty/missing list returns `[]`.
- `exportCsv` now logs a deprecation warning (it is not removed).
- Adds `test/fixtures/items.json`.

## Testing
- Manual: `lowStock(fixtures)` → `['A1']`, `lowStock([])` → `[]`.
- `npm test`: 1 pass, 1 fail. The failure (`totalValue ignores negative quantities`) also fails on `main`; this PR doesn't touch `totalValue`.
- No automated tests for `lowStock` yet. Only a fixture was added.
