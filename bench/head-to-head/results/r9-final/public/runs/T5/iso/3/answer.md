I committed the staged change as `e33d8a3`: "feat(list): cache bookings list for 60 seconds". It includes `src/cache.js`, `src/list.js` and `test/list.test.js`. I didn't run the tests.

One behavior to be aware of: the cache holds the bookings list for 60 seconds. A new or changed booking won't show up in `listBookings` until that time has passed, unless the cache is replaced.