# Add low-stock threshold report

## What

- Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs with `qty <= threshold`, and `[]` for empty or missing input.
- Adds `test/fixtures/items.json`, a sample inventory fixture.
- `exportCsv` now logs a deprecation warning (`src/export.js`). It still works and is not removed.

## Testing

CI was green when last checked. I didn't re-run tests for this description.

Note: the branch has no new test file, only the fixture. `lowStock` has no tests yet.
