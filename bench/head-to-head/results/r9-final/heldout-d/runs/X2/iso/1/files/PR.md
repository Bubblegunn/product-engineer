## Add low-stock report

Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, and `[]` for an empty or missing list.

### Changes
- `src/stock.js`: new `lowStock`.
- `test/fixtures/items.json`: fixture for the new tests.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is not removed, despite the commit "remove legacy exportCsv".

### Testing
`npm test` on this branch: one failure, `totalValue ignores negative quantities`. The same test fails on `main`, so this PR doesn't cause it. The `lowStock` tests pass.
