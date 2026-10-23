```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          9d06583
  - dirty:         no
  - changed files: 2 (vs HEAD~1: src/reminders.js, test/reminders.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs: 8 files; empty-functions: 8 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 6 passed, 0 failed, 0 skipped (361 ms)
  - Note: the runner's JSON reported passed=0, but its raw output shows
    "pass 6 / fail 0" and exit_code 0. The parser doesn't read node's
    test output, so I took the counts from the raw output.

[4/5] E2E probe
  - Called dueReminders() directly: one cancelled and one confirmed booking, both checking in within 24h
  - exit_code: 0
  - evidence:  returned only [{"id":2,...,"status":"confirmed"}]. The cancelled booking was excluded.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**Commit status:**
- The commit `9d06583` ("fix(reminders): skip cancelled bookings in stay-starts-tomorrow email") was created before verify ran.
- The hook reported it as blocked, but git shows it landed.
- The tree is clean.
- I didn't amend or redo the commit. If you want the hook to see a commit made after a passing verify, I can recreate it.

**DOD.md items this change doesn't satisfy:**
- The project-specific criterion in `DOD.md` is still the placeholder.
- No docs mention the reminder behavior, so there was nothing to update.