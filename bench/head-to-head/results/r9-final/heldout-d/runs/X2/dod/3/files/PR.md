# Add lowStock threshold report

## What
- `lowStock(items, threshold = 10)` in `src/stock.js` returns the SKUs with `qty <= threshold`. It returns `[]` for empty or missing input.
- `exportCsv` now logs a deprecation warning. It is not removed.
- Adds `test/fixtures/items.json`.

## Testing
`npm test` does **not** pass on this branch: 1 pass, 1 fail.
- The failing test is `totalValue ignores negative quantities` (`-15 !== 5`). It fails the same way on `main`, so this branch didn't cause it.
- No tests for `lowStock` are in the diff, even though commit `3252d13` says "add tests for lowStock". The fixture is the only test-side change, and nothing uses it yet.
- I haven't run `lowStock` end to end.

## Notes for reviewers
- Commit `744e94f` is titled "remove legacy exportCsv", but it only adds a `console.warn`.
- The `<=` comparison and the default threshold of 10 are my assumptions. Please confirm them.
