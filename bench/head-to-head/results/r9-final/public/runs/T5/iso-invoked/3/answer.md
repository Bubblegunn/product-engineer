I committed the staged change as `8a6375d` on `main`: `feat(list): cache the bookings list for 60 seconds`. I did not run the tests.

The commit holds the three staged files:
- **`src/cache.js`:** a new time-limited cache.
- **`src/list.js`:** `listBookings` now reuses its result for 60 seconds.
- **`test/list.test.js`:** two tests, one for a repeat call and one for a call after 61 seconds.

**Stale data:** `listBookings` can now return data up to 60 seconds old. A booking created or changed in that window won't show until the cache expires. The cache has no way to clear it early.