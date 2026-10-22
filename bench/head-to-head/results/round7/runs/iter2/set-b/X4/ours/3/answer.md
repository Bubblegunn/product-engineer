Availability search is faster, and `PR.md` for Marta is written. I haven't committed anything.

**What changed**
- `findAvailable` in `src/availability.js` used to scan all 50,000 bookings for each of the 400 bikes. It now makes one pass over the bookings and collects the blocked bike ids in a `Set`. Then it filters the bikes against that set.
- The sort order (price, then id) and the rule that back-to-back bookings are allowed are unchanged.

**Tests**
I ran `npm test` (`node --test`) after the final edit. It printed:
```
✔ booked bike is not offered (1.825ms)
✔ back-to-back bookings are allowed (0.32275ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
The claim that the answer is unchanged rests on two things. One is this run of the two existing tests. The other is a benchmark that compared old and new results on made-up data of your size, where both returned the same bikes in the same order. I haven't run it on real bookings.

**Speed**
These are made-up data: 400 bikes, 50,000 bookings over a year, and a 3-day window. I took the median of 20 runs after a warm-up.

| Run | Before | After |
|---|---|---|
| Earlier, three runs | 52 to 56 ms | 0.62 to 0.65 ms |
| Latest | 61 ms | 0.26 ms |

That is roughly 85 times faster in the earlier runs and about 235 times in the latest. The new version's time varies between runs. `PR.md` still says "about 85 times faster, 55 ms to 0.6 ms", which matches the three earlier runs. I didn't update it for the latest run.

**Open items**
- My very first benchmark run reported 254 available bikes. Every later run reported 55 with the same seeded generator. I didn't find out why. The `PR.md` figures come from the later runs.
- I added no new tests, and none covers many bookings for one bike.
- The benchmark script is in `/tmp/bench`, outside the repo.