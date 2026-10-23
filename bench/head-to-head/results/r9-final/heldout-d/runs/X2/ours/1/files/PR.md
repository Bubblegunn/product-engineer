# Add low-stock report

For the customer:
What changed: The inventory module can now list the items that are running low (10 or fewer in stock by default, or any limit you choose). An empty inventory gives an empty list.
Why it matters: Staff can see what to reorder without scanning the whole stock list.

## Changes
- `src/stock.js`: new `lowStock(items, threshold = 10)` returns the SKUs with `qty <= threshold`, and `[]` for a missing or empty list.
- `src/export.js`: `exportCsv` now logs a deprecation warning on each call. Despite the commit title ("remove legacy exportCsv"), it is not removed. The returned string looks unchanged from reading the diff, but no test covers `exportCsv`, so I did not verify it.
- `test/fixtures/items.json`: sample items. The commit titled "add tests for lowStock" adds only this fixture, and no test calls `lowStock`.

## Testing
- Ran `npm test` on this branch: 1 passed, 1 failed. The failure is `totalValue ignores negative quantities`, which fails the same way on `main`, so this branch did not cause it.
- `lowStock` has no test, so it is unchecked beyond reading the code.
- I did not look at CI; the "tests pass" claim doesn't hold for a local run.
