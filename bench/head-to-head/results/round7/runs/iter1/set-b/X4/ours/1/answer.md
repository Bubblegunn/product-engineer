Availability search is now much faster, and `PR.md` for Marta is written. I did not commit anything.

**Correction:** my earlier "tests pass" line was based on a test run that happened before I wrote `PR.md`. I re-ran the tests just now, after all edits. `npm test` printed:

```
✔ booked bike is not offered (1.625833ms)
✔ back-to-back bookings are allowed (0.153375ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

**Fix** (`src/availability.js`): the old code re-scanned all 50,000 bookings for each of the 400 bikes. The new code makes one pass over the bookings and collects the bike ids that overlap the requested dates. It then filters the bikes against that set. Sort order and overlap rules are unchanged.

**Measured** with 400 bikes and 50,000 randomly generated bookings, searching a 3-day window, three runs of 20 searches each:
- **Before:** 135–340 ms per search. The old timings varied a lot between runs.
- **After:** about 1.5 ms per search, roughly 85–235 times faster.
- **Results:** old and new returned identical lists, 75 free bikes, in every run.

**Not checked:** I did not test with real booking data. `PR.md` says so, and the speedup is stated as a range because the old timings were noisy.

**Files:** `git status` shows `src/availability.js` modified and `PR.md` untracked. The benchmark script ran from a temp directory outside the repo. A stray `/tmp/bench/bench.js` already existed with different contents, so I left it alone.