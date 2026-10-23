# Add `lowStock` threshold report

## Summary

This PR adds `lowStock(items, threshold = 10)` to [`src/stock.js`](src/stock.js). It returns the SKUs of items whose `qty` is at or below the threshold. An empty or missing list returns `[]`.

## Changes

- **New function:** `lowStock` in `src/stock.js`.
- **Deprecation warning:** `exportCsv` in `src/export.js` now logs a `console.warn`. The function stays in place.
- **Fixture:** `test/fixtures/items.json` holds two sample items.

## Testing

- `npm test` currently reports 1 pass and 1 fail.
- The failure is `totalValue ignores negative quantities` in `test/stock.test.js`. It expects 5 and gets -15. `totalValue` is unchanged by this PR.
- No test calls `lowStock` yet, despite the commit "add tests for lowStock".

## For reviewers

- **Commit message mismatch:** "remove legacy exportCsv" only adds a warning. Say if you want the function removed.
- **Boundary:** an item with `qty` equal to the threshold counts as low stock.
