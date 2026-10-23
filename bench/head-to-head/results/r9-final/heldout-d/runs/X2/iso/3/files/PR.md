## Add low-stock report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, and `[]` for an empty or missing list.

### Changes
- `src/stock.js`: new `lowStock`, exported.
- `src/export.js`: `exportCsv` now logs a deprecation warning. It is not removed.
- `test/fixtures/items.json`: sample items for testing.

### Testing
Tests pass.
