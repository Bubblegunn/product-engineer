Done — committed as `f90c0ac` on branch `perf/monthly-report` (branched off `main` rather than committing to the default branch directly).

## What was slow

`src/report.js:4` re-parsed `b.checkOut` into a fresh `Date` **on every iteration of the loop condition**, and called `toISOString()` to build a full timestamp just to slice off the first 10 characters — once per night, per booking. A 100k-booking month did ~750k date parses and ~750k ISO formats.

## The change

Nights accumulate into a `Map` keyed by integer UTC day number; each distinct day gets formatted once at the end. Both endpoints are parsed once per booking.

```
bookings |  nights | old      | new     | speedup
    1000 |    7394 | 4.29ms   | 0.28ms  | 15.2x
   10000 |   74407 | 42.20ms  | 2.61ms  | 16.1x
  100000 |  747030 | 423.87ms | 26.09ms | 16.2x
```

Scope/method: synthetic bookings of 1–14 nights over one month, Node v24.13.0 on darwin arm64, median of 60 runs (15 at 100k), warm, stable across two runs. **These are bench numbers, not production timings.**

Two subtleties I had to preserve, both of which a naive rewrite gets wrong:
- Bucketing by raw epoch-ms would split two bookings that start on the same date at different clock times into separate keys, so `Math.floor(t / DAY_MS)` collapses them the way the original did.
- Iterating over *day numbers* instead of instants changes the night count when a stay ends later in the day than it started, so the loop still compares instants.

## Verification

- Byte-identical output vs. the old implementation across 22 edge cases (month/year/leap-day boundaries, same-date-different-times, zero-night and reversed stays, invalid/missing/null dates, `Date` objects, epoch-ms numbers, pre-1970) plus 3,000 randomised booking sets — including key order.
- Added `test/report.test.js`, the repo's first tests (6 passing). They also pass against the *old* code, so they pin pre-existing behavior rather than my rewrite. This is slightly beyond "make it faster" — flagging it rather than slipping it in.

Against "done means observed", I could not tick: production logs, inspecting written data, or a real browser — this repo is a single pure function with no runtime, DB, or app around it. I did exercise the failure paths (unparseable, missing, and reversed dates). Nothing is pushed and no PR exists; say the word if you want either.
