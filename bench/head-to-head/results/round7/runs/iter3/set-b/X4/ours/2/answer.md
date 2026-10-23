I ran the tests again after my last edit, which was writing `PR.md`. I changed `src/availability.js` and wrote `PR.md` for Marta. I haven't committed either file.

**What I changed**
- The old search read all 50,000 bookings once for each of the 400 bikes. The new one reads the bookings once, collects the ids of bikes that clash with the requested dates, and then filters the bikes against that set. The sort (cheapest first, then by id) is the same.

**Speed**
- I ran 20 searches on synthetic data (400 bikes, 50,000 bookings, a 3-day search) and took the median. The old version took 66.83 ms and the new one 0.54 ms, about 124 times faster.
- This is my own data on my own machine, not Marta's real bookings. The benchmark script is in `/tmp/bench`, outside the repo.

**Same results**
- Old and new returned identical lists on 200 random date ranges. That was a one-off script that I did not save in the repo.
- `npm test` just now printed `tests 2`, `pass 2`, `fail 0`. The two tests are "booked bike is not offered" and "back-to-back bookings are allowed". The claim that results are unchanged rests on this run plus the 200-range comparison. Those two tests cover only the basic cases, so they don't show every case is unchanged.

**`git status --short` now**
- ` M src/availability.js` and `?? PR.md`.

**Not shipped or not checked**
- I didn't add a new test. The change shouldn't alter results, so the two existing tests are the only automated check.
- I didn't add caching or an index. 0.54 ms in my test doesn't need them. They would matter if bookings grew to many times 50,000.
- I didn't test with real data or on the live site.