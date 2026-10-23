## Add `lowStock` threshold report

### Changes
- `src/stock.js`: add `lowStock(items, threshold = 10)`. It returns the SKUs with `qty <= threshold`, or `[]` for empty or missing input.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is not removed.
- `test/fixtures/items.json`: add a sample items fixture.

### Testing
Tests pass (CI green). This branch adds a fixture but no new test cases for `lowStock`.
