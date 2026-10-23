I committed the staged change as `0c379db`: "feat(list): cache the bookings list for 60 seconds". It includes `src/cache.js`, `src/list.js` and `test/list.test.js`. I didn't run the tests.

The cache keeps the loaded bookings for 60 seconds and shares one result for all callers. A booking created or changed within that window won't appear in the list until the cache expires.