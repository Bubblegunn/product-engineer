## Add low-stock report

Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, or `[]` for an empty or missing list.

### Changes
- `src/stock.js`: new `lowStock`, exported alongside `totalValue`.
- `src/export.js`: `exportCsv` now logs a deprecation warning. Behavior is otherwise unchanged, and the function is not removed.
- `test/fixtures/items.json`: sample items fixture.

### Testing
Tests pass in CI.

### Notes
- This PR adds a fixture but no new test cases for `lowStock`.
