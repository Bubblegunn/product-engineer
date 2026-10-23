## Add low-stock report

Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, and `[]` for empty or missing input.

### Also in this PR
- `exportCsv` now logs a deprecation warning with `console.warn`. It is not removed.
- Adds `test/fixtures/items.json` (two sample items).

### Testing
CI was green at last check.
