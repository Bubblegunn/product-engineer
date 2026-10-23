# Add `lowStock` threshold report

## What
- Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs with `qty <= threshold`, and `[]` for empty or missing input.
- Adds `test/fixtures/items.json`.
- `exportCsv` now logs a deprecation warning via `console.warn`. It is **not** removed.

## Testing
`npm test` on this branch: 1 pass, 1 fail. The failing test is `totalValue ignores negative quantities`. It fails the same way on `main` (1 pass, 1 fail), so this branch didn't cause it.

`lowStock` has no tests yet. `test/stock.test.js` is unchanged, and the new fixture isn't used by any test.

## Notes for reviewers
- The commit messages say "add tests for lowStock" and "remove legacy exportCsv". Neither matches the diff. Consider squashing.
- `console.warn` in `exportCsv` will print on every call.
