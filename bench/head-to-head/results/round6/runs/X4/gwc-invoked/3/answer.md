Fixed, but I can't say we're good to ship: `node --test` is red here.

**Fix:** In `src/parse.js`, the loop did `total = ...`, so only the last unit counted. It's now `total += ...`. `'1h30m'` gives 5400 (the existing "hours and minutes" test passes).

**Test run:** 3 of 4 tests pass. The failing one is `exports the big sample unchanged`. It fails with `ENOENT` because `fixtures/big-sample.csv` isn't in the repo. The README says that file is too large to commit and lives on the team drive, so it has to be copied in by hand.

- The failure is a missing file, not a code bug. `export.js` is untouched, and I haven't checked it against the real data.
- CI will fail unless it has that fixture. I don't know whether it does.
- I didn't fake the file or skip the test. A stand-in CSV would make the run green without checking the real data.

**To get green:** Copy `big-sample.csv` into `fixtures/` and re-run `node --test`. If CI can't get the file, the test needs a committed small fixture or a skip when the file is missing. That's your call.

**Skill note:** I loaded `git-weekly-changelog`, but it doesn't fit this task. It's for read-only history summaries and says not to run tests. The repo has one commit, so there was no week of history to summarize, and I skipped the changelog. I ran the tests anyway because you asked for a ship verdict.

The fix is uncommitted. Tell me if you want me to commit it.