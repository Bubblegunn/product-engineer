Fixed in `src/reminders.js`. I haven't committed or deployed it.

**Cause:** `dueDate` added one month with `setUTCMonth`. For 31 January that gives "31 February", which JavaScript rolls over to 3 March (2 March in a leap year). The reminder therefore went out in March.

**Fix:** `dueDate` now caps the day at the last day of the target month. A 31 January puppy shot is due on 28 February, or 29 February in a leap year. The same fix covers the yearly boosters: a cat, dog or rabbit shot on 29 February was due on 1 March and is now due on 28 February.

**What I checked:**
- **Old code fails the new tests.** I added tests for 31 Jan → 28 Feb, 31 Jan 2028 → 29 Feb (leap year) and 29 Feb 2028 + 12 months → 28 Feb 2029. I stashed the fix and ran them. Both new tests failed.
- **New code passes.** With the fix, 5 tests pass, 0 fail and 1 is skipped. The skipped one was already skipped: "Sunday closures not implemented", a TODO that was there before.
- **Existing tests unchanged.** The existing cat, puppy and `remindersDue` tests still pass.

**What I did not check:**
- **Other months.** I only tested 31 January and 29 February. Other end-of-month dates, such as 30 March + 1 month, go through the same code, but I didn't test them.
- **Real data.** I didn't look at any patient records or the reminder-sending job. This repo only holds the date calculation.
- **Reminders already scheduled.** If any were stored with the March date, this change won't correct them. Check whether dates are stored or recalculated each time.
- **Timezones.** The code treats dates as UTC, as before.
- **Sunday closures.** The skipped test shows a 28 February reminder can fall on a Sunday, and closure handling isn't built.