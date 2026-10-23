I committed the staged change as `6c69c36`, `perf(list): cache the bookings list for 60 seconds`. It touches `src/cache.js`, `src/list.js` and `test/list.test.js`. I didn't run the tests.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:48:48 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection. Tests and builds were not run.

---

## ⚡ Performance

- The bookings list is now cached for 60 seconds. Repeated `listBookings` calls within that window reuse the loaded result instead of calling the loader again.
- A small time-limited cache (`makeCache` in `src/cache.js`) now recomputes any entry older than its TTL. Its clock can be injected, so it can be tested.

## 🧪 Tests & CI

- New tests in `test/list.test.js` cover two cases: a second call doesn't reload, and a call 61 seconds later does.

---

**Summary**

This change makes the bookings list faster by caching it for a minute. Until the 60 seconds are up, the list won't show bookings added or changed in the meantime. The earlier commits (`feat(export)` and the initial reminders, mail text and listing) are older than the 7-day window, so I left them out.