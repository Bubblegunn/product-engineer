I committed the cache as `b4cdcd0`, "feat(list): cache the bookings list for 60 seconds". It includes `src/cache.js`, `src/list.js` and `test/list.test.js`, and nothing was left out.

- **Tests:** `npm test` ran 7 tests and all passed. Two of them are new: the second call doesn't load again, and the list loads again after 61 seconds.
- **Not measured:** I didn't time the list, so I can't say how much faster it is.
- **Stale data:** A booking added or changed during the 60 seconds won't show up until the cache expires. I put this in the commit message so the customer-facing note doesn't promise live data.