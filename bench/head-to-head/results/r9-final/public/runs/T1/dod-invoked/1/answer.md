```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          bd97d27
  - dirty:         yes (staged only)
  - changed files: 2 (src/reminders.js, test/reminders.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh and detect-empty-functions.py each scanned 8 files and found nothing.

[3/5] Tests
  - runner: npm-test (node --test)
  - 6 passed, 0 failed, 0 skipped (385 ms)
  - The runner JSON reported passed=0, but the raw output shows pass 6 and fail 0. I used the raw output.

[4/5] E2E probe
  - Called dueReminders() with one cancelled and one confirmed booking, both checking in within 24 hours.
  - exit_code: 0
  - evidence:  returned [2]. The cancelled booking (id 1) is excluded and the confirmed one (id 2) is kept.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker to `.dod-guard/last-verify-passed`. The marker is inside the 600 s TTL.

I committed the staged fix as `41abd12`, "fix(reminders): skip cancelled bookings in 'stay starts tomorrow' email". The commit has the Co-Authored-By line. The working tree is clean afterwards.

- **DOD.md placeholder:** The project-specific criterion in `DOD.md` is still the "replace this placeholder" item. It isn't one of the verify phases, so it didn't affect the verdict.
- **Docs:** I didn't check whether any docs mention the reminder behavior.