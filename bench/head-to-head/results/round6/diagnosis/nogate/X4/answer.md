Availability search is faster, and `PR.md` for Marta is written. I did not commit anything.

- **Fix:** `src/availability.js` used to scan all 50,000 bookings once per bike. It now scans bookings once, notes which bikes clash with the requested dates, and filters the bikes against that list. The sort order is unchanged.
- **Timing:** I benchmarked 400 bikes and 50,000 bookings of made-up data, searching a 3-day window, averaged over 5 repetitions per run. Over three runs the old code took about 220–430 ms per search and the new code about 1 ms. That is roughly 200–400× faster, and the old timings varied a lot between runs.
- **Same results:** On the benchmark data, old and new code returned the identical list of 370 free bikes. The 2 existing tests pass.
- **Not checked:** I did not run it against real data or a real server. `PR.md` says this and gives the timing as a range.