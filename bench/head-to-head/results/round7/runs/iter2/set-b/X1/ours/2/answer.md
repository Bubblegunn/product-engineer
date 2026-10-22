Fixed in the working tree. I haven't committed it, and I haven't deployed or run it against real data.

**Cause:** `dueDate` in `src/reminders.js` added one month to the shot date without handling short months. 31 January plus one month became "31 February", which JavaScript turns into 3 March. So the reminder went out in March.

**Fix:** The due date now stays in the target month. If that month is shorter, it uses the month's last day. 31 January 2026 gives 28 February 2026, and in a leap year 31 January gives 29 February.

**What I checked:**
- I read `src/reminders.js`, `test/reminders.test.js` and `package.json`. There are no other files or callers in the repo. `dueDate` is the only place due dates are calculated, and `remindersDue` uses it.
- I added 7 tests to `test/reminders.test.js`:
  - 31 January to 28 February
  - 31 January to 29 February in a leap year (2028)
  - 30 January to 28 February
  - 31 March to 30 April
  - 31 December to 31 January of the next year
  - cat shot on 29 February 2028 to 28 February 2029
  - a puppy shot on 31 January 2026 shows up in `remindersDue` on 28 February
- With the old code, 6 of those 7 tests fail. The 31 December test passes either way, so it only guards against regressions.
- With the fix, `npm test` gives 10 passed, 0 failed, 1 skipped. The skipped test is the existing "Sunday closures" TODO, which I didn't touch.

**Not checked:**
- **Other species:** The same fix applies to every species. A yearly shot on 29 February now goes to 28 February of the next year. That choice is a guess, because I don't know your clinic's rule. Previously it went to 1 March.
- **Sent reminders:** I don't know whether any March reminders have already gone out for 31 January puppy shots. The repo only calculates dates and doesn't send anything, so I couldn't check this. If some went out, those owners may need a manual follow-up.
- **Unknown species or dates:** I didn't change how an unknown species or a bad date string is handled.
- **Scheduler and time zones:** I don't know how the real scheduler calls `remindersDue`. It uses UTC dates, and I didn't check it against your clinic's local time.