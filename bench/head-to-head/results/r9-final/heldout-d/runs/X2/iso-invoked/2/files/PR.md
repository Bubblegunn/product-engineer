# Add lowStock threshold report

This PR adds `lowStock`, which lists the SKUs (stock keeping units) at or below a quantity threshold.

## What changed

- **New function:** [`lowStock(items, threshold = 10)`](file://<WORK>/runs/X2-iso-invoked-2/repo/src/stock.js#L4-L7) returns the SKUs where `qty <= threshold`. It returns `[]` for empty or missing input.
- **Deprecation warning:** [`exportCsv`](file://<WORK>/runs/X2-iso-invoked-2/repo/src/export.js#L2) now logs a `console.warn`. It is not removed.
- **Fixture:** [`items.json`](file://<WORK>/runs/X2-iso-invoked-2/repo/test/fixtures/items.json) holds two sample items.

## Testing

`npm test` does not pass. One test fails on this branch and on `main`: `totalValue ignores negative quantities` returns -15, not 5. This PR does not touch `totalValue`.

This branch adds no tests for `lowStock`. The fixture exists, but no test uses it.

## Review notes

- **Commit messages differ from the diff:** "remove legacy exportCsv" only adds a warning, and "add tests for lowStock" only adds a fixture.
- **Boundary:** `lowStock` includes items where `qty` equals the threshold.
