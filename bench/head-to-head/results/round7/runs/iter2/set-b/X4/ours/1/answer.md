Availability search is faster, and `PR.md` for Marta is written. I did not commit anything.

- **Fix:** `src/availability.js` used to scan all bookings once for every bike. It now scans bookings once, collects the bike ids that have an overlapping booking, and filters those bikes out. The overlap rule and the sort order are unchanged.
- **Tests:** I ran `npm test` again after the last edit. It printed `ℹ tests 2`, `ℹ pass 2` and `ℹ fail 0`. The two tests are `booked bike is not offered` and `back-to-back bookings are allowed`. I added no new tests.
- **Speed:** The benchmark used 400 bikes and 50,000 bookings, generated with random dates and prices. I ran it 5 times and took the median of 20 searches each time.
  - **Old code:** 52.66 to 71.09 ms.
  - **New code:** 0.22 to 0.62 ms.
  - **Speedup:** roughly 100 times faster. The exact figure varied between runs, and my first run gave 300 times. I corrected `PR.md`, which had quoted that single run.
- **Same results:** On that one generated data set and one 3-day date range, the old and new versions returned the same bikes in the same order (55 bikes free). The two tests and this benchmark comparison are the only evidence that behaviour is unchanged. I did not test other inputs, such as bookings for bike ids that are not in the bike list.
- **`PR.md`:** It opens with the plain-language "For the customer" block, then covers how I measured, what changed in the code, and what I did not check. It states that the data is not Marta's real shop data.

The benchmark script is in `/tmp/bench/bench.js`, outside the repo.