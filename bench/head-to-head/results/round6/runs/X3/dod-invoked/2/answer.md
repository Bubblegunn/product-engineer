Verify finished and I wrote `RELEASE_NOTES.md`. The verdict is FAIL, because the "fix: crash on empty input" commit doesn't fix anything.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: tally, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          cf889a6
  - dirty:         no (only RELEASE_NOTES.md added afterwards)
  - changed files: 3 since v1.2.0 (src/cli.js, src/count.js, test/count.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh: 0 issues, 3 files scanned. detect-empty-functions.py: 0 issues.

[3/5] Tests
  - runner: node (npm test)
  - 3 passed, 0 failed, 0 skipped (186 ms)
  - run-full-suite.sh reported passed:0. That is a parser gap. The raw output and a direct `node --test` run both show 3 pass, exit 0.

[4/5] E2E probe
  - Ran run() from src/cli.js with node -e on "a is the fox" and on ""
  - exit_code: 0 for the script, but the empty-input call threw
  - evidence: run([], '') throws "Cannot read properties of null (reading 'filter')"
    run([], 'a is the fox') returns "2" (it was 4 in v1.2.0)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. Empty-input crash is not fixed. Commit 7940f22 only added a comment in src/count.js,
     and `text.match(/\S+/g)` still returns null on "". No test covers it.
  2. Silent behavior change in commit cf889a6 ("chore: tidy option defaults"). The default
     minLength went from 1 to 3 in src/count.js. Words under 3 characters are no longer
     counted by default, and no test covers it.
```

I didn't write the verify marker, as the command requires on FAIL.

**Release notes:** I wrote them to match what the code does now:
- **New:** `--json` output.
- **Changed:** the default minimum word length is now 3.
- **Fixed:** I left this as "nothing user-facing yet" instead of claiming the crash fix.
- **Not mentioned:** `--csv`, which was added and then reverted.
- **Version:** I left the title as "version to be set". This release adds a feature and changes default behavior, so v1.3.0 would fit better than a patch version. That's your call.

**Decisions for you:**
- **Empty input:** the one-line fix is to return 0 when `text.match` returns null. I haven't made it, because you only asked for notes. Say so if you want it plus a test.
- **minLength default:** decide whether 3 is intended. If it isn't, revert it to 1 and drop the "Changed" entry.

I didn't tag or push.