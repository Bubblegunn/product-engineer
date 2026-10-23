Fixed in `src/reminders.js`. Nothing is committed or deployed.

**Cause:** `dueDate` added one month with `setUTCMonth`. 31 January plus one month is "31 February", which JavaScript rolls over to 3 March. I ran the old code and got `2026-03-03` for a puppy shot on `2026-01-31`.

**Fix:** The date now moves to the 1st, adds the months, then uses the original day capped at the last day of the target month. 31 Jan 2026 gives `2026-02-28`.

**What I checked:**
- **Old behaviour:** I stashed my change and ran the old code. It returned `2026-03-03` for `('2026-01-31', 'puppy')`.
- **Tests:** `npm test` shows 5 pass, 0 fail, 1 skipped. The skipped test is the existing Sunday-closure TODO, which I didn't touch.
- **New tests:**
  - 31 Jan 2026 gives 28 Feb 2026.
  - 31 Jan 2028 (leap year) gives 29 Feb 2028.
  - 31 Mar 2026 gives 30 Apr 2026.
  - A cat shot on 29 Feb 2024 gives 28 Feb 2025.

**Not checked:**
- **Wider impact:** The same overflow also affected 29 Feb dates for the 12-month species (rabbit, cat, dog). Those now clamp to 28 Feb too. Check whether that is the date you want.
- **Reminders already sent or scheduled:** I only fixed the date calculation. Reminders already stored or queued with the March date won't change. This repo has no scheduler or storage code, so I couldn't look at them.
- **Real data:** I ran no real patient data through it. I don't know whether other code calls `dueDate` or `remindersDue`.
- **Time zones:** The code uses UTC throughout. I didn't test how it behaves against your clinic's local date.

The change is uncommitted in the working tree (`src/reminders.js`, `test/reminders.test.js`). Say so if you want me to commit it.