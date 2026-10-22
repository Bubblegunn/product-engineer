Fixed in the working tree, not committed. I haven't deployed anything.

**Cause:** `dueDate` in `src/reminders.js` added the month with `setUTCMonth`. February has no 31st, so the date rolled into March. A 31 January shot came out as 3 March (2 March in leap years).

**Fix:** `dueDate` now keeps the day of month but caps it at the last day of the target month. A 31 January puppy shot is now due 28 February (29 in a leap year).

**What I checked:**
- **Reproduced first.** Before the change, `dueDate('2026-01-31','puppy')` returned `2026-03-03`, and `2028-01-31` returned `2028-03-02`.
- **Tests with the fix.** `node --test` shows 7 passed, 0 failed, 1 skipped. The skipped one is the existing "Sunday closures" TODO, which I didn't touch.
- **New tests fail without the fix.** I stashed only the `src` change and re-ran. The 4 new tests failed and the 3 original ones passed. So the new tests do cover the bug.
- **Cases covered by the new tests:**
  - 31 January to 28 February (2026) and 29 February (2028).
  - `remindersDue` leaves the patient out on 27 February and lists them on 28 February.
  - 31 March to 30 April.
  - 31 December to 31 January of the next year.
  - Cat shot on 29 February 2024 to 28 February 2025.

**What I didn't check:**
- I didn't look at how or where reminders are sent. The repo only has the date logic, with no scheduler or messaging code.
- I didn't look at reminders that were already scheduled with the wrong March date. If any are stored or queued, they won't update from this change. Check with whoever runs the sending job.
- I only tested UTC date strings (`YYYY-MM-DD`). Other input formats weren't tested.
- The change also affects other species. A shot on 29 February now gives 28 February the next year instead of 1 March. I think that's correct, but it is a behavior change you may want to know about.

I didn't commit. Tell me if you want me to.