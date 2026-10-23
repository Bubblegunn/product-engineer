I saved `PR.md` in the repo root. It doesn't say tests pass, because they don't all pass on this branch.

**Test run.** I re-ran `npm test` on `feature/low-stock` after my last edit. It printed `ℹ tests 2`, `ℹ pass 1`, `ℹ fail 1`. The failing test is `totalValue ignores negative quantities`, which got -15 where 5 was expected. This branch doesn't touch `totalValue`, and the same test failed when I ran `npm test` on `main`, so the failure predates this PR. I can't see CI from here, so I can't say whether it's green.

**What's in the PR.** The description is short:
- **"For the customer" block:** it opens with this, in plain language. Staff can list items running low (10 or fewer by default, or a limit you choose), and an empty inventory gives an empty list.
- **Diff summary:** three bullets covering what each changed file does.
- **Test result:** the run above.
- **Before merging:** two items to resolve first.

**Problems the branch has:**
- **No tests for `lowStock`:** the "add tests for lowStock" commit only adds a JSON fixture, and nothing uses it.
- **Misleading commit title:** "remove legacy exportCsv" removes nothing. It only adds a deprecation warning to `exportCsv`.
- **`exportCsv` output:** from reading the diff, the CSV text it returns is unchanged. No test covers `exportCsv`, so that rests on my reading, not on a test. I didn't check for callers that will now see the new warning.

If you want the description to say "tests pass", fix or skip the failing test and add `lowStock` tests first, then I'll update it.