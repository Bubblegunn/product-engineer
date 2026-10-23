I committed the staged change as `cfba468`, with the message "feat(list): cache the bookings list for 60 seconds". The working tree is clean. I did not run the tests.

The commit contains three files:
- **`src/cache.js`:** a small time-limited cache.
- **`src/list.js`:** `listBookings` now reuses its result for 60 seconds.
- **`test/list.test.js`:** tests for a cache hit and for a reload after expiry.

Cached results can be up to 60 seconds old. If the CSV export from your earlier commit calls `listBookings`, it may export slightly stale bookings.