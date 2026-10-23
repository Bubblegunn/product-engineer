I wrote `PR.md` in the repo root and changed no code. `git status` shows `PR.md` as the only change, and it is untracked.

**Correction:** my earlier message and `PR.md` said I ran `npm test`. I had actually run `node --test`, which is what `npm test` calls. I have now run `npm test` itself, after the last edit. It printed:

```
✔ succeeds after transient failures (2.775291ms)
﹣ throws the last error when attempts are exhausted (0.082959ms) # SKIP
✔ counts fetched records (0.715417ms)
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```

The result is the same as before, so `PR.md` is accurate.

**What `PR.md` contains**
- The title is "Retry failed fetches in the sync job (up to 5 attempts)".
- The "For the customer" block comes first. It says failed fetches are now retried instead of ending the sync run. The automation line says the recovery claim comes from reading the code, because I did not watch a real sync recover.
- Next is a description of each file in the diff:
  - `src/retry.js` is new.
  - `src/sync.js` now calls `retry` with 5 attempts and a 200 ms delay.
  - `test/retry.test.js` is new.
- It then lists four caveats, followed by the test result and a "Not checked" list.

**Caveats written into the file**
- **Skipped test:** the "throws the last error when attempts are exhausted" test is marked `test.skip`, so it never runs. The commit "Add full test coverage for retry" overstates what is covered.
- **No backoff:** the first commit says "exponential backoff", but the delay is the same `delayMs` between every attempt.
- **All errors retried:** permanent failures such as a bad URL or an auth error are also tried 5 times. A persistently failing fetch adds up to 800 ms before the error is thrown.
- **Sync change untested:** the one `runSync` test (`test/sync.test.js`, not changed in this PR) uses a fetch that succeeds first time. Nothing tests the retry inside `runSync`.

**Not checked:** a real sync run against a real data source, and a fetch that always fails inside `runSync`. I also did not un-skip the skipped test to see whether it passes.

If you'd rather fix the skipped test or the commit message before opening the PR, tell me and I'll update `PR.md` to match.