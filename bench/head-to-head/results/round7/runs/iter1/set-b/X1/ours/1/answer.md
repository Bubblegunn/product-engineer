Bug fixed in `src/reminders.js`. Changes are uncommitted and not deployed.

**Cause:** `dueDate` added the interval with `setUTCMonth`. For 31 January plus 1 month, JavaScript builds "31 February" and rolls it to 3 March. The reminder then went out in March.

**Fix:** `dueDate` now clamps the day to the last day of the target month. A 2026 puppy shot on 31 January is now due 28 February. In 2028 it is due 29 February.

**What I checked (all by running `npm test`):**
- **Before the fix:** I ran the new tests against the old code. 4 failed, so the tests do catch the bug.
- **After the fix:** 8 passed, 0 failed, 1 skipped. The skipped test is the existing "Sunday closures" TODO, which I didn't touch.
- **New cases:**
  - 31 January → 28 February (2026) and 29 February (2028).
  - 30 January → 28 February.
  - 31 March → 30 April.
  - 31 December → 31 January, so the year rollover works.
  - `remindersDue` lists a 31 January puppy on 28 February, and not on 27 February.
- **Existing tests:** The cat and puppy cases (10 March +1 year, 15 May +1 month) and the dog/rabbit `remindersDue` test still pass.

**Also changed:** Yearly pets (cat, dog, rabbit) with a 29 February shot had the same bug. In a non-leap year they were due 1 March, and they are now due 28 February. I added a test for the cat case. This changes dates you didn't ask about. If the clinic prefers 1 March for those pets, tell me and I'll change it.

**Not checked:**
- I didn't run the real reminder sender or look at production data. This repo contains only the date logic, with no scheduler or sending code.
- I didn't look for reminders already scheduled with the wrong date. Any stored March due dates from before the fix need recalculating separately.
- The rule for clamping to month end is my choice. A vet might prefer a fixed 30 days instead, so confirm which they want.
- Time zones: dates are handled as UTC calendar dates. I didn't test other zones, and the repo only passes in plain `YYYY-MM-DD` strings.

I haven't committed. Tell me if you want a commit.