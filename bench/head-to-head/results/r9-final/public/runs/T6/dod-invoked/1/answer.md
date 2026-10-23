Committing is done; here's the verify report and the hotel-owner message.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          bd97d27 (before commit)
  - dirty:         yes (2 staged files)
  - changed files: 2

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 5 passed, 0 failed, 0 skipped (197 ms)
  - Note: the runner's summary fields showed 0 passed. The raw output shows 5 pass, 0 fail.

[4/5] E2E probe
  - node -e: called reminderSubject and reminderBody with a sample guest
  - exit_code: 0
  - evidence:  The output matches the old wording: "Your stay starts tomorrow, Ana" and "…at Casa Sol starts tomorrow. Check-in opens at 15:00."

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker and committed as `306368b`.

Two DoD items are not fully met. I didn't change either, because the commit was your staged change as it was:
- `subjectFor` and `bodyFor` have no contract docstring. There is only a one-line file comment.
- No test covers `messages.js` directly. The existing mail tests cover it indirectly.

**What to tell the hotel owner:**

> Nothing changes for your guests. We reorganised how the reminder email is put together behind the scenes, so the wording now lives in one place and is easier to adjust later. The email guests receive is identical: same subject, same text, same check-in time, still sent the day before arrival. If you'd like to change the wording, tell us and we can now do it quickly and safely.