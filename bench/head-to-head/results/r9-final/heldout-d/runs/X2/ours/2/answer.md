I saved `PR.md` in the repo root, but it doesn't say "tests pass", because they don't. I re-ran `npm test` on `feature/low-stock` just now and it printed:

```
✔ totalValue sums qty*price
✖ totalValue ignores negative quantities
ℹ tests 2
ℹ pass 1
ℹ fail 1
```

- **Failing test:** `totalValue ignores negative quantities` returns -15 where 5 is expected. The branch doesn't touch `totalValue` or that test, so the failure is probably already on `main`. I didn't run `main` to confirm. I haven't looked at CI myself, so it may be green on an older commit or a different setup.
- **No tests for the new code:** The commit "add tests for lowStock" only adds `test/fixtures/items.json`, and no test uses it. Nothing covers `lowStock` or the new `exportCsv` warning.
- **Misleading commit title:** "remove legacy exportCsv" doesn't remove anything. It adds a `console.warn` to `exportCsv`.
- **Correction to my earlier claim:** I had said the `exportCsv` output was unchanged. That came from reading the diff, where the return line isn't touched. No test covers it and I never ran it. `PR.md` now says that instead.

`PR.md` is short. It opens with a plain-language "For the customer" block, followed by a three-bullet change list and the test result as observed. If you want a "tests pass" line, the failing test needs fixing first, or you can tell me CI really is green and I'll reword it.