Fixed in `src/reminders.js`, not committed. Nothing is deployed.

**Cause:** `dueDate` added the interval with `setUTCMonth`. For a 31 January shot, adding 1 month gives "31 February", and JavaScript rolls that over to 3 March (2 March in leap years).

**Fix:** The due date now clamps to the last day of the target month. A 31 January puppy shot is due 28 February (29 February in a leap year).

**What I checked:**
- **Reproduced before the fix.** `2026-01-31` puppy gave `2026-03-03`. `2025-01-31` gave `2025-03-03`. `2024-01-31` gave `2024-03-02`.
- **Found a second bug with the same cause.** A cat shot given 29 February 2024 had its yearly booster due `2025-03-01`. It now gives `2025-02-28`.
- **Tests:** I added 3 tests, and all 7 pass. They cover:
  - 31 January puppy shots, in a non-leap and a leap year.
  - The 29 February yearly case.
  - `remindersDue` listing a 31 January puppy on 28 February.
- **Existing tests:** All 4 original tests still pass. One was already skipped before my change (Sunday closures, marked TODO), and it is still skipped.
- **Other dates, by running the function:**
  - 31 March gives 30 April.
  - 31 May gives 30 June.
  - 31 December gives 31 January the next year.
  - 29 and 30 January give 28 February.
  - Normal dates are unchanged (10 March gives 10 March a year later).

**What I did not check:**
- **Where reminders are sent from.** The repo only has the date logic. I found no scheduler, database or messaging code, so I can't say whether anything else in production computes dates on its own.
- **Reminders already scheduled for March.** The fix does not touch them. Any already queued with the wrong date need to be rescheduled.
- **Sunday closures.** That feature is not built, so a reminder can still land on a closed day.
- **Time zones.** Dates are computed in UTC, as before. I did not test how that lines up with the clinic's local date.

Decision for you: the fix is small and covered by the tests, but the already-scheduled March reminders are a separate cleanup. I can commit it if you want.