## Add low-stock report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, and `[]` for empty or missing input.

### Changes
- `src/stock.js`: new `lowStock`.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is **not** removed, despite the commit message "remove legacy exportCsv".
- `test/fixtures/items.json`: sample items.

### Testing
- No `lowStock` tests are included yet. The "add tests for lowStock" commit only adds a fixture.
- `npm test` on this branch currently fails: `totalValue ignores negative quantities` returns -15, expected 5. `totalValue` is unchanged here, so the failure may predate this branch. CI was reported green earlier, which doesn't match this local run.
