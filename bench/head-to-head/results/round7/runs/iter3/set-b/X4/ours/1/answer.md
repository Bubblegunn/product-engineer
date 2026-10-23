Availability search is faster, and `PR.md` for Marta is written. Nothing is committed.

**Fix** (`src/availability.js`): the old code re-scanned all bookings for each of the 400 bikes. It now scans bookings once and collects the IDs of bikes with an overlapping booking into a `Set`. It then filters the bikes against that set. The overlap rule and the sort order are unchanged.

**Tests:** I ran `npm test` (`node --test`) after the last edit. Printed result:
```
✔ booked bike is not offered (0.703041ms)
✔ back-to-back bookings are allowed (0.074584ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```
The claim that behaviour is unchanged rests on two things:
- These two tests: the booked-bike case and the back-to-back case.
- One comparison run: old and new returned the same list on the benchmark data (`same result: true`, 254 bikes available).

Two tests and one data set do not prove every case is identical. The logic is the same overlap check and the same sort, so I expect no difference.

**Speed:** the benchmark used 400 bikes, 50,000 random bookings, and 20 searches averaged.
- Old: about 66.7 ms per search.
- New: about 0.56 ms per search, roughly 120 times faster.

**Not checked:**
- I used synthetic data on my machine, not real shop data or the production server.
- I added no new test.
- I did not change how bookings are stored or loaded.

`PR.md` states all of this in plain language for Marta. Its "What stays the same" and test lines match the run above. Say so if you want a commit.