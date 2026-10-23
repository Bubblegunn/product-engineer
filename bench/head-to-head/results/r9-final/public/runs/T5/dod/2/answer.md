Your cache change is committed as `56cc38b`, and I added a small follow-up commit, `f0aed93`, to clear a DoD-Guard failure.

**The failure:** the first `/dod:verify` run skipped the suspicious-returns detector. That detector flagged `test/list.test.js:20`, where the test's loader returned only `[]`. I changed it to return `[{ id: loads }]` and committed that separately instead of amending your commit.

**Where it stands now:**
- All four detectors (stubs, empty functions, suspicious returns, test tautology) report 0 issues.
- All 7 tests pass.
- The verify marker is refreshed.

The cache is still a module-level 60-second cache with no invalidation, so a future booking create or cancel would show stale lists for up to a minute.

I did not address these `DOD.md` items:
- JSDoc on the new functions.
- A README update.
- Moving the TTL into config.

I can do any of them as another commit if you want.