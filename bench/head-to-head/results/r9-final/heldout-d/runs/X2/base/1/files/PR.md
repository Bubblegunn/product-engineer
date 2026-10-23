## Add low-stock report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs with `qty <= threshold`, or `[]` for empty or missing input.

### Changes
- `src/stock.js`: new `lowStock`.
- `test/fixtures/items.json`: sample items fixture.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is **not** removed, despite the "remove legacy exportCsv" commit message.

### Testing
- `npm test` fails on this branch: `totalValue ignores negative quantities` (got -15, expected 5). That test is in `test/stock.test.js`, which this PR doesn't touch, and `totalValue` is unchanged here, so the failure predates this branch.
- There are no tests for `lowStock` yet. The "add tests for lowStock" commit only adds the fixture.
