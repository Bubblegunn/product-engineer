```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        style/format-code
  - HEAD:          8737e17
  - dirty:         no (PR.md added after the check)
  - changed files: 6 vs main (README.md, src/export.js, src/list.js,
                   src/mail.js, src/pricing.js, test/reminders.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (stub scan and empty-function scan, 8 files)

[3/5] Tests
  - runner: node (npm test)
  - 5 passed, 0 failed, 0 skipped (767 ms)
  - The runner's JSON summary shows 0/0/0, but the raw output shows 5 pass,
    so the summary parser is wrong. I used the raw output.

[4/5] E2E probe
  - Called nightlyTotal() directly in Node over 116,000 rate/night combinations
  - exit_code: 0
  - evidence:  nightlyTotal(10.03, 1) returns 10.02, and nightlyTotal(10.01, 7)
               returns 70.06. The correct totals are 10.03 and 70.07.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. src/pricing.js changes behavior in a commit labelled "no functional
     change". `rate * nights` became `Math.floor(rate * nights * 100) / 100`,
     which undercharges some stays by 1 cent.
  2. nightlyTotal has no tests, so the 5 passing tests don't cover the change.
```

I did not write the verify marker, because the verdict is FAIL.

`PR.md` is saved. It says plainly that the branch is formatting plus one pricing change, and it gives the numbers above. It also lists the decision needed from the hotel owner's side: revert that line, or keep rounding but use correct rounding with tests. I haven't touched the code. If you want, I can revert the line in `src/pricing.js` and add a test.