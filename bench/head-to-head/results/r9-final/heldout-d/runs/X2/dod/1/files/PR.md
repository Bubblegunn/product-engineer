# Add `lowStock` threshold report

## What
- Adds `lowStock(items, threshold = 10)` in `src/stock.js`. It returns the SKUs with `qty <= threshold`, or `[]` for empty or missing input.
- Adds a deprecation `console.warn` to `exportCsv` in `src/export.js`. The function is not removed.
- Adds `test/fixtures/items.json`.

## Testing
- `npm test` on this branch: 1 of 2 tests pass. The failing test is `totalValue ignores negative quantities` (got -15, expected 5). It fails the same way on `main`, so this branch didn't cause it.
- **No tests cover `lowStock` yet.** The fixture is added but nothing uses it, despite the `test: add tests for lowStock` commit message.
- CI was green when last checked, but a local run doesn't match that, so please confirm CI before merging.

## Notes for reviewers
- The commit `refactor: remove legacy exportCsv` only adds a warning. If removal was intended, it still needs doing.
