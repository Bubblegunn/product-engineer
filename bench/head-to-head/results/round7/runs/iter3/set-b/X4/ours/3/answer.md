Availability search is faster and `PR.md` is written for Marta. I haven't committed anything.

**What changed**
- `findAvailable` in `src/availability.js` used to check every booking for every bike, about 20 million checks per search.
- It now makes one pass over the bookings and collects the bikes that overlap the requested dates. It then filters the bikes against that set.
- The overlap rule and the sort order (price, then id) are unchanged.

**Speed**
- I used made-up data: 400 bikes, 50,000 bookings spread over one year, and a 3-day search window.
- I ran each version 20 times and took the median.
- The search went from about 63 ms to about 0.5 ms, roughly 130 times faster.
- Both versions returned the same 234 bikes in this test.
- I haven't measured this on real shop data or on the live system.

**Tests**
I ran `npm test` (`node --test`) again just now, after the last edit. The output was:
```
✔ booked bike is not offered (0.644375ms)
✔ back-to-back bookings are allowed (0.068292ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
- The claim that the results are unchanged rests on two things: these 2 tests, and the 234-bike comparison above.
- The tests cover one overlapping booking and one back-to-back booking. They don't cover edge cases such as several bookings on one bike or a bike with no bookings.
- I didn't add new tests.

**`PR.md`**
- It's in plain language for Marta, with the customer-facing summary first, then how I measured, then a short technical note.
- It states that the timings come from made-up data on one computer.

`git status` shows only `src/availability.js` modified and `PR.md` untracked. Do you want me to commit?