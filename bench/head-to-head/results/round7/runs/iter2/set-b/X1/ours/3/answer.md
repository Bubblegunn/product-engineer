Fix done in `src/reminders.js`, not committed and not deployed. I did not commit because you didn't ask.

**Cause:** `dueDate` added one month with `setUTCMonth`. For 31 Jan that gives "31 Feb", which JavaScript rolls over to 3 March. Fix: `dueDate` now caps the day at the last day of the target month, so 31 Jan gives 28 Feb (29 Feb in leap years).

**What I checked**
- I ran the old code on four dates. All four gave wrong results:
  - 2026-01-31 puppy → 2026-03-03 (bug reproduced)
  - 2028-01-31 puppy → 2028-03-02
  - 2026-03-31 puppy → 2026-05-01 (should be 30 Apr)
  - 2024-02-29 cat → 2025-03-01 (should be 28 Feb)
- I added three tests: 31 Jan puppy (2026 and leap year 2028), 31 Mar puppy, and 29 Feb yearly. The new code passes them.
- `npm test`: 6 passed, 0 failed, 1 skipped. The skipped test was already skipped before my change ("Sunday closures not implemented"). Nothing covers it.

**What I did not check**
- I never ran the new tests against the old code through the test runner. Only the direct calls above show the old code fails on those dates.
- I did not run it against real patient data or the real reminder sender. This repo only has `dueDate` and `remindersDue`. I found no scheduler or sending code.
- Reminders already wrongly scheduled for March are not corrected by this change.
- The change also moves 29 Feb yearly shots from 1 Mar to 28 Feb. 28 Feb is the usual convention, but it is a behavior change for rabbits, cats and dogs. Confirm it's what you want.
- Sunday and closed-day handling is not implemented.

Deploy risk looks low: one function changed and dates only move earlier, never later. I'd still check that the already-scheduled March reminders get rescheduled.