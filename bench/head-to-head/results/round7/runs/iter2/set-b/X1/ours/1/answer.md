Fixed in `src/reminders.js`. A puppy shot given on 31 January 2026 now gets a booster date of 2026-02-28. Before the fix it got 2026-03-03. I have not committed or deployed anything.

**Cause:** `dueDate` used `setUTCMonth(month + 1)`. On 31 January that produces "31 February", and JavaScript rolls it over into early March. The fix sets the day to 1, moves the month, then sets the day to the smaller of the original day and the last day of the target month.

**What I checked:**
- **Bug reproduced:** I stashed my change and ran the original code. `dueDate('2026-01-31','puppy')` returned `2026-03-03`.
- **Fix confirmed:** `npm test` shows 5 passed, 0 failed and 1 skipped. I added two tests:
  - 31 January goes to 28 February in 2026 and 2027, and to 29 February in the 2028 leap year.
  - 31 March goes to 30 April for a puppy, and 29 February 2028 goes to 28 February 2029 for a cat.
- **Skipped test:** The skipped test was already in the repo. It is the "Sunday closures" TODO, and I did not touch it.

**Other things to know:**
- **Wider fix:** The same rollover also affected the 12-month animals. A cat, dog or rabbit shot on 29 February was due on 1 March the next year. It is now due on 28 February.
- **Not checked:** I only ran the unit tests. I did not look at how this code is called or scheduled, because the repo has only `src/reminders.js` and its test. Nothing in the repo shows the reminder job or any data.
- **Already-queued reminders:** If reminders for 31 January shots were already computed and stored with the March date, deploying this will not correct them. You would need to check wherever those dates are stored.
- **Choice for you:** I picked 28 February (the last day of the month) over 1 March. If the clinic prefers a different rule, tell me and I'll change it.