Availability search is now about 125 to 760 times faster. `PR.md` for Marta is written with the numbers below. I haven't committed anything.

**The fix.** `findAvailable` in `src/availability.js` used to scan every booking for each bike, about 20 million checks per search. It now makes one pass over the bookings and notes which bikes are taken for the requested dates. It then filters and sorts the bike list as before.

**Tests.** I ran `npm test` after the last code edit. It printed:
```
✔ booked bike is not offered (0.875958ms)
✔ back-to-back bookings are allowed (0.09475ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
The claim that behaviour is unchanged rests on two things:
- **Those two tests:** "booked bike is not offered" and "back-to-back bookings are allowed".
- **A comparison run:** the old and new code returned the same 205 bikes in the same order on made-up data (400 bikes, 50,000 bookings). The script printed `same result: true available: 205`.

Two tests and one data set are a narrow check, not proof for every input.

**Timing.** The made-up data used a 5-day search window. I timed both versions five times:

| | Time per search |
|---|---|
| Old | about 135 to 490 ms |
| New | about 0.6 to 1.1 ms |

The old version's times varied a lot between runs. The fifth run, which I did after my earlier summary, took 486 ms. That is why the range is now wider and I corrected `PR.md` to match: 125 to 760 times faster instead of 125 to 360.

**Not checked.**
- I used made-up bookings, not Marta's real ones.
- I only timed the search function, not the whole app.

**Benchmark script.** `/tmp/bench/bench.js` is not the script I wrote. Something replaced it with a version that compares two files, and I used that one. The copy of the old code is `/tmp/bench/old.js`.