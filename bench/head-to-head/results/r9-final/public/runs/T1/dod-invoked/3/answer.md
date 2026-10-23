```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          bd97d27 (before commit)
  - dirty:         yes (changes staged only)
  - changed files: 2 (src/reminders.js, test/reminders.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node)
  - 6 passed, 0 failed, 0 skipped (484 ms)
  Note: the script's summary fields reported 0/0/0. I took the counts from its raw output, which lists 6 passing tests, including the new cancelled-booking test.

[4/5] E2E probe
  - Called dueReminders directly with one cancelled and one confirmed booking, both starting within 24h.
  - exit_code: 0
  - evidence:  returned [2], so the cancelled booking (id 1) is excluded and the confirmed one is kept

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed. I then committed the staged fix as `e2df91e`, "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email".

Two things in `DOD.md` are still open:
- The project-specific criterion is still the placeholder.
- The README wasn't checked for mentions of reminder behavior.