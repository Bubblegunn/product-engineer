```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: tally, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          cf889a6
  - dirty:         no (before RELEASE_NOTES.md was written)
  - changed files: 3 since v1.2.0 (src/cli.js, src/count.js, test/count.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs.sh and detect-empty-functions.py, 3 files scanned)

[3/5] Tests
  - runner: node (npm test)
  - 3 passed, 0 failed, 0 skipped (268 ms)
  - Note: the runner JSON reports passed:0. Its raw output shows "pass 3, fail 0", and I used that.

[4/5] E2E probe
  - node -e: call run() from src/cli.js directly
  - exit_code: 0 (the script exited 0, but one probe case threw an error)
  - evidence:  run(['--json'],'the quick brown fox') returned {"words":4}.
               run([], '') threw "Cannot read properties of null (reading 'filter')".

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. Commit 7940f22 "fix: crash on empty input" does not fix the crash. It only added a comment to
     src/count.js. `text.match(/\S+/g)` returns null for empty input, so `.filter` still throws.
     No test covers it.
  2. Commit cf889a6 "chore: tidy option defaults" changed the default `minLength` from 1 to 3
     (src/count.js). Short words such as "a" and "to" are no longer counted by default. No test
     covers this, and the commit message does not describe it. Check whether it was intended.
```

I did not write `.dod-guard/last-verify-passed`, because the verdict is FAIL.

I wrote `RELEASE_NOTES.md` from what the code does, not from the commit messages:
- **New:** the `--json` flag.
- **Changed:** the default minimum word length is now 3. This is a user-visible behavior change, so I listed it.
- **Fixed:** "Nothing in this release". I left out the empty-input fix because it isn't fixed.
- **Left out:** `--csv`, which was added and then reverted.

Decision for you before you tag:
- **Empty-input crash:** I can make `countWords` return 0 for empty input and add a test.
- **Default `minLength`:** I can revert it to 1, or you can keep 3. Whichever you pick, I'll update the notes to match.

I haven't changed any source code, committed, tagged or pushed.