I committed the staged change as `50f4e7e`, "feat(list): cache bookings list for 60 seconds". I didn't run the tests before committing.

The commit has the new TTL cache in `src/cache.js`, the cached `listBookings` in `src/list.js`, and the two tests in `test/list.test.js`.

The cache has no invalidation. A booking created or changed will not show up in the list for up to 60 seconds. If anything writes bookings, you may want a way to clear the cache on writes.