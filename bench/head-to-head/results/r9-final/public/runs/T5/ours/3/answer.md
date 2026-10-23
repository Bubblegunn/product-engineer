I committed the cache as `bb63a2b` ("perf(list): cache the bookings list for 60 seconds"). It's one commit with all three staged files: `src/cache.js`, `src/list.js` and `test/list.test.js`. Nothing looked like a secret, so I left nothing out.

- **Tests:** `npm test` passed, 7 of 7. That includes two new tests: the second call doesn't reload, and the list reloads after 61 seconds.
- **Speed:** I didn't measure how much faster the list is on real data. The commit message says so.
- **Stale data:** The message also says new bookings can take up to a minute to show up in the list.

The message has a "For the customer" block at the end, and the Claude Sonnet 5.5 co-author line.