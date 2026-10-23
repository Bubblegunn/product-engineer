# Add low-stock report

For the customer:
What changed: You can now get a list of the products that are running low, meaning 10 or fewer units left. A different cut-off can be used instead.
Why it matters: You can see what needs reordering without going through the whole inventory by hand.

## Changes
- `src/stock.js`: new `lowStock(items, threshold = 10)`. It returns the SKUs with `qty <= threshold`, and `[]` for empty or missing input.
- `src/export.js`: `exportCsv` now logs a deprecation warning on every call. The return line is untouched in the diff, but no test covers `exportCsv`, so I didn't verify the output by running it. Despite the commit title "remove legacy exportCsv", nothing is removed.
- `test/fixtures/items.json`: new fixture. No test uses it yet.

## Tests
Ran `npm test` on the branch: 2 tests, 1 passed, 1 failed.
- The failure is `totalValue ignores negative quantities` (got -15, expected 5). I didn't touch `totalValue` or that test, so it looks pre-existing. I didn't run it on `main` to confirm.
- Nothing tests `lowStock` or the `exportCsv` warning, and the "add tests for lowStock" commit only adds the fixture. I haven't checked CI myself.
