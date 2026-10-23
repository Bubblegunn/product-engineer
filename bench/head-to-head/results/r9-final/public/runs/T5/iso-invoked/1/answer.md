I committed the staged cache change as `4e65186` (`feat(list): cache the bookings list for 60 seconds`). I didn't run the tests.

The commit holds three files: `src/cache.js`, `src/list.js` and `test/list.test.js`. The message ends with the Co-Authored-By line.

I loaded only the core plain-language skill (iso-24495-1), not the legal, technical or document-design ones. The task was a commit message, and the staged diff has no legal text or complex document.

One behaviour to know about: the cache holds the bookings for 60 seconds. A booking created or changed during that time will not show in the list until the entry expires.