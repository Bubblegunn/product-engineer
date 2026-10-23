I committed the staged cache change as `feat(list): cache the bookings list for 60 seconds`. It was a single commit with all three staged files: `src/cache.js`, `src/list.js` and `test/list.test.js`. Nothing looked like a secret, and nothing was left out.

I ran `npm test` first: 7 passed, 0 failed. The two new tests show that a second call within 60 seconds doesn't reload, and that a call after 61 seconds does.

I didn't measure how much faster the list is, so the commit message doesn't claim a speedup.

Bookings added within the last minute may not show up in the list yet. The commit's customer-facing block says so.