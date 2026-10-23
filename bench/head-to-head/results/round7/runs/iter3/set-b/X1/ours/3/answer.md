Bug fixed in `src/reminders.js`. Not committed. Not deployed.

**Cause:** `dueDate` used `setUTCMonth(+1)`. From 31 Jan that gives "31 Feb", which JavaScript rolls over to 3 Mar. The reminder then went out in March, not February.

**Fix:** The due day is now capped at the last day of the target month. A 31 Jan puppy shot is due 28 Feb (29 Feb in a leap year). The same cap fixes yearly shots given on 29 Feb, which were due 1 Mar and are now due 28 Feb.

**What I checked:**
- **Reproduced first.** Before the fix, `dueDate('2026-01-31','puppy')` returned `2026-03-03`. `dueDate('2024-02-29','cat')` returned `2025-03-01`.
- **Added 6 tests:**
  - 31 Jan → 28 Feb
  - 31 Jan → 29 Feb in a leap year
  - 29 Feb + 1 year → 28 Feb
  - 30 Mar → 30 Apr (a normal month still works)
  - 31 Dec → 31 Jan (year rollover)
  - `remindersDue` includes the 31 Jan puppy on 28 Feb
- **Tests fail without the fix.** With the old code, 4 of the 6 new tests fail. The other 2 are regression guards that pass on both versions.
- **Tests pass with the fix.** `npm test` shows 9 passed, 0 failed, 1 skipped. The skipped test was already skipped before my change (Sunday closures, marked TODO).

**What I did not check:**
- **Other months:** I did not test every month-end. The logic is the same for all of them.
- **Deployment:** I looked only at `src/reminders.js` and its tests. The repo has no scheduler, sender or deploy config. I don't know how `remindersDue` is called in production.
- **Time zones:** `dueDate` works in UTC dates. I did not check what format or time zone the caller passes in `today`.
- **Past reminders:** I did not look for 31 Jan puppies whose reminders already went out late. Reminders created earlier are not corrected.

**Behavior to confirm before you deploy:** a puppy shot on 31 Jan is now due 28 Feb, which is 28 days later. If the clinic wants that case to be 1 Mar, tell me and I'll change it.