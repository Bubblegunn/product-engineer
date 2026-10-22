Fixed in `src/reminders.js`. I haven't committed it, so the change is in the working tree only.

**Cause:** `dueDate` added one month with `setUTCMonth`. For 31 Jan that gives "31 Feb", which JavaScript rolls over to 3 March. The old code returned `2026-03-03` for a shot given on 2026-01-31.

**Fix:** The due date now falls on the same day of the target month. If that month is shorter, it falls on the month's last day. So 31 Jan gives 28 Feb (29 Feb in a leap year).

**What I checked:**
- **Reproduced the bug:** with the old code, the new test for 31 Jan returns `2026-03-03` instead of `2026-02-28`.
- **Added tests:**
  - 31 Jan 2026 gives 28 Feb.
  - 31 Jan 2028 gives 29 Feb, a leap year.
  - 31 Mar gives 30 Apr.
  - 29 Feb 2024 on a yearly interval gives 28 Feb 2025.
- **Tests fail before, pass after:** the three new test cases fail on the old code. With the fix, `npm test` shows 6 passed, 0 failed and 1 skipped. The skipped test is the existing "Sunday closures" TODO, which I didn't touch.

**Not checked:**
- I didn't run it against real patient data or the live reminder sender. This repo has only `dueDate` and `remindersDue`, so I don't know how or when the reminders are actually sent.
- I didn't look for reminders already sent late, or already scheduled for March. This fix doesn't change those.
- I didn't check the clinic's rule for month-end dates. I chose "last day of the month", but they might want 1 March instead.

**Also changed:** the same bug affected yearly boosters for shots given on 29 Feb. Those used to be due on 1 March of the next year and are now due on 28 Feb. Say so if you'd rather keep the old behavior for that case.