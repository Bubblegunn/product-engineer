Fixed in `src/reminders.js`, not committed. I haven't run it anywhere except locally, so the deploy call is yours.

**Cause:** `dueDate` added a month with `setUTCMonth`. For 31 January that makes "31 February", which JavaScript rolls over to 3 March. The reminder then went out in March.

**Fix:** the due date is now clamped to the last day of the target month. A puppy shot given 31 January is due 28 February (29 in a leap year).

**What I checked:**
- **Reproduced first.** Before the change, `dueDate('2026-01-31','puppy')` returned `2026-03-03`.
- **After the change:** the same call returns `2026-02-28`.
- **`remindersDue` end to end.** A puppy with a 31 January shot is listed as due on 2026-02-28.
- **Tests.** `npm test` gives 5 passed, 0 failed, 1 skipped. The 3 original tests still pass. I added 2 tests: 31 January in a normal year and a leap year (2028), and month-end clamping for other cases (29 February + 12 months → 28 February; 31 March + 1 month → 30 April).
- **The skipped test** is the existing "Sunday closures" TODO. It was skipped before my change and I didn't touch it.

**Side effect:** the bug affected every species, not only puppies. Cat, dog and rabbit shots given on 29 February were also pushed to 1 March. Those now land on 28 February. This is a behaviour change outside your report, but it is the same fix.

**What I didn't check:**
- Only `src/reminders.js` and its tests are in the repo. I don't know how reminders are sent or scheduled. I didn't test that code, and I didn't check whether any reminders were already sent late.
- I didn't check other 29, 30 or 31 start dates beyond the cases above.
- The code uses UTC dates only. I didn't look at timezone handling in whatever calls it.