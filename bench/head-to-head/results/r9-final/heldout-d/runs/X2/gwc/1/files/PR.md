## Add low-stock report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs with `qty <= threshold`, and `[]` for empty or missing input.

### Changes
- `src/stock.js`: new `lowStock`.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is **not** removed, despite the commit message "remove legacy exportCsv".
- `test/fixtures/items.json`: new fixture.

### Testing
- `npm test` currently **fails** on this branch. `totalValue ignores negative quantities` returns -15 where the test expects 5. This test is in `test/stock.test.js` and `totalValue` is not changed by this PR, so it looks like it was already failing on main. I haven't confirmed that.
- There are no tests for `lowStock` yet. The commit "add tests for lowStock" only adds the fixture.
