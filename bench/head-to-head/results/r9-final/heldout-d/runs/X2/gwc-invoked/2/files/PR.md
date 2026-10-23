## Add low-stock report

Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs of items with `qty <= threshold`, and `[]` for empty or missing input.

- Tests and a fixture entry added for `lowStock`.
- `exportCsv` is **not removed**. It now logs a deprecation warning via `console.warn`. (The commit message says "remove", but the diff only adds the warning.)

**Testing:** CI was green at last check. I haven't re-run the tests locally.
