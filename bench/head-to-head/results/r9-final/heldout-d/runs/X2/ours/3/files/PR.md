# Add low-stock report

For the customer:
What changed: The inventory module can now list which items are running low (10 or fewer in stock by default, or a limit you choose). An empty inventory gives an empty list instead of an error.
Why it matters: Staff can see what needs reordering without checking items one by one.

## What the diff shows
- `src/stock.js`: new `lowStock(items, threshold = 10)`. Returns the SKUs with `qty <= threshold`, and `[]` for a missing or empty list.
- `src/export.js`: `exportCsv` now logs a deprecation warning on every call. The commit is titled "remove legacy exportCsv", but nothing is removed. By reading the diff, the returned CSV text is unchanged, but no test covers `exportCsv`, so that is not pinned by any test. I did not check for callers that would now see the warning.
- `test/fixtures/items.json`: a two-item fixture. Nothing in the diff uses it.

## Tests
Ran `npm test` on this branch: `ℹ tests 2`, `ℹ pass 1`, `ℹ fail 1`.
- Failing: `totalValue ignores negative quantities` (got -15, expected 5). It also fails on `main`, and this branch doesn't touch `totalValue`, so it predates this PR.
- There are no tests for `lowStock`. The commit "add tests for lowStock" adds only the fixture. I did not trace CI, so I can't say it is green.

## Before merging
- Add `lowStock` tests (empty list, threshold boundary, default threshold).
- Decide whether the `exportCsv` warning belongs in this PR, and fix the commit title if it stays.
