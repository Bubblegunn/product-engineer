```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          cd40e6c
  - dirty:         no
  - changed files: 2 (src/reminders.js, test/reminders.test.js, in HEAD)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (8 files scanned by both detectors)

[3/5] Tests
  - runner: npm test (node --test)
  - 6 passed, 0 failed, 0 skipped (586 ms)
  - Note: the script's JSON summary said passed=0, but the raw output shows 6 pass / 0 fail.
    The script's parser doesn't read node:test output. I used the raw numbers.

[4/5] E2E probe
  - Called dueReminders() with one cancelled and one confirmed booking, both due within 24h
  - exit_code: 0
  - evidence:  returned [2], so only the confirmed booking is reminded

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

- **Commit:** The fix is committed as `cd40e6c`, `fix(reminders): skip cancelled bookings in stay-starts-tomorrow email`. The hook's block message came after the commit had already gone through. I ran verify afterwards, so the commit wasn't verified before it was made.
- **Remaining DOD.md items:** These are outside what `/dod:verify` checks. The project-specific placeholder is still unfilled. I didn't check whether the README mentions reminder behavior.