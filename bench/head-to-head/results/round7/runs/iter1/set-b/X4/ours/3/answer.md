Search is now about 90 times faster, and `PR.md` for Marta is written. I haven't committed anything.

- **Fix:** `src/availability.js` used to check every booking for every bike, which is 400 × 50,000 comparisons. It now makes one pass over the bookings. It collects the IDs of bikes with an overlapping booking, then filters the bikes against those IDs. Sort order and back-to-back bookings behave as before.
- **Tests:** both existing tests pass (2 pass, 0 fail). I just re-ran them to confirm, because my first run's output didn't show the counts.
- **Speed:** on random data with 400 bikes and 50,000 bookings, the old search took 94.5 ms and the new one takes 1.0 ms. These are median times over 15 runs. Both versions returned the same 205 bikes in the same order.
- **Limits:** the timing is from one development machine with generated data, not Marta's real bookings or server. `PR.md` says this and doesn't promise the same figure there.

The benchmark script is in `/tmp/bench`, outside the repo.