Done — committed on branch `speed-up-monthly-report` (I branched off `main` rather than committing to it directly).

**What was slow:** `src/report.js:4-5` did two things per *night* that should happen far less often — re-parsed `b.checkOut` into a fresh `Date` on every iteration of the loop condition, and built a full ISO timestamp via `toISOString()` just to slice off the first 10 characters. Both costs scale with total nights (~150k in my test data), but a monthly report only spans ~30 distinct dates, so nearly all that string work was redundant.

**The fix:** tally into a `Map` keyed by integer UTC day number, then format each distinct date once at the end. The inner loop is now pure integer arithmetic. `Map` iteration order preserves the original object's first-seen key ordering.

**Measured:** 20k bookings → **94ms to 6.8ms (~14x)**. At 1k bookings, 4.6ms → 0.38ms.

**One thing worth flagging.** My first attempt bounded the loop with `Math.ceil(checkOut / DAY)`, which passed against my initial fixture — but only because every date in it was midnight-aligned. It silently overcounted by a day for any stay with a real check-in time: a 15th 14:00 → 17th 10:00 stay reported 3 nights instead of 2. The correct bound is `ceil((checkOut - checkIn) / 1 day)` — nights actually slept, not calendar dates touched. If your booking records carry real check-in/check-out times rather than bare dates, that distinction is load-bearing, and it's now pinned by a test.

I verified equivalence rather than assuming it: 5000 randomized fuzz trials against the old implementation (random times of day, years 1968–2028, including zero-length and reversed stays) plus explicit edge cases — leap days, year boundaries, pre-1970 dates, century-leap 1900/2000, `Date` and epoch-number inputs, unparseable dates. All identical.

I also added `test/report.test.js` (6 tests, all passing). `package.json` already declared `node --test` but the repo had no tests, so there was nothing guarding this behavior before — worth having, given the trap above. If you'd rather keep the change to `src/` alone, that file is easy to drop.
