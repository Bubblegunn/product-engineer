# Add low-stock report

Adds `lowStock(items, threshold = 10)` to `src/stock.js`. It returns the SKUs with `qty <= threshold`, and `[]` for an empty or missing list.

## Changes

- **Feature:** `lowStock` threshold report.
- **Fix:** an empty or null item list returns `[]`.
- **Internals:** `exportCsv` now logs a deprecation warning. It isn't removed, even though the commit message says "remove".
- **Tests:** adds the fixture `test/fixtures/items.json`.

## Testing

CI was green when last checked. I didn't re-run tests for this description.
