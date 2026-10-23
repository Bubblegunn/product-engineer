I committed the staged cache change as `e09a2b0`, `feat(list): cache the bookings list for 60 seconds`. It covers `src/cache.js`, `src/list.js` and `test/list.test.js`. I didn't run the tests.

You loaded the changelog skill, but you only asked for the commit, so I didn't write a changelog. Here is what the week looks like, from `git log` over 2026-10-16 → 2026-10-23 (+03):

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:48:48 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection, apart from the one commit made at your request. No tests or builds were run.

## ⚡ Performance

- The bookings list is now cached for 60 seconds. Repeated `listBookings` calls reuse the loaded result instead of calling the loader again.

## 🧪 Tests & CI

- New tests check that a second call doesn't reload and that the list reloads after 61 seconds.

The CSV export of bookings (`bd97d27`) was committed on 2026-10-15, one day before this window starts. It would appear if you widened the range to two weeks.