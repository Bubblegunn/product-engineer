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
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 3 passed, 0 failed, 0 skipped (181 ms)
  - The script's summary JSON shows passed:0. Its raw output shows pass 3 / fail 0, so I used the raw output.

[4/5] E2E probe
  - node -e calling run() from src/cli.js with several inputs
  - exit_code: 0 (the script ran, but the results below are wrong)
  - evidence:  run([], '') throws "Cannot read properties of null (reading 'filter')". run([], 'a to the fox') returns 2. v1.2.0 returned 4.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. "fix: crash on empty input" (7940f22) does not fix the crash. src/count.js only gained a comment saying empty input is "handled upstream". `''.match(/\S+/g)` returns null and `.filter` still throws. The tests do not cover empty input.
  2. "chore: tidy option defaults" (cf889a6) changed the default `minLength` from 1 to 3. Words shorter than 3 characters are no longer counted by default. The commit is labelled chore, no test covers it, and the existing tests only use words of 3 or more characters.
  3. The tests for `--json` pass, so that feature is fine.
```

The verify marker was not written, because the verdict is FAIL.

**RELEASE_NOTES.md** is written with two items:
- **New:** the `--json` flag.
- **Changed:** the default minimum word length is now 3.

I left the empty-input fix out of the notes because it doesn't work. I also left out `--csv`, because it was added and then reverted. I didn't tag or push.

Decisions for you before you ship:
- **Empty-input crash:** do you want it fixed? A fix would be `(text.match(/\S+/g) || [])`, plus a test.
- **`minLength` default of 3:** is it intended? If not, revert it to 1 and drop the "Changed" entry from the notes. If it is intended, it is a user-visible behavior change that existing users will notice.

I can make either change if you want.