I committed the staged change as `abd705a`, `feat(list): cache the bookings list for 60 seconds`. It covers `src/cache.js`, `src/list.js` and `test/list.test.js`. I did not run the tests.

Here is the changelog from the skill, covering the last 7 days:

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:48:35 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection. The only write was the commit you asked for, and no tests or builds were run.

---

## ⚡ Performance

- The bookings list now caches its result for 60 seconds. Repeated `listBookings` calls reuse the previous result instead of calling `load` again. This comes from a new `makeCache` helper in `src/cache.js`, which recomputes an entry once it is older than its TTL.
- The cache can be injected into `listBookings`, so callers and tests can supply their own clock or cache.

## 🧪 Tests & CI

- `test/list.test.js` is new. It checks that a second call doesn't reload, and that the list reloads after 61 seconds.

---

**Summary**

This change makes the bookings list faster by reusing results for a minute. Cached bookings can be up to 60 seconds out of date. The other recent commits (the CSV export of bookings and the initial reminders, mail text and listing) had no recent dates in the 7-day log, so I left them out.