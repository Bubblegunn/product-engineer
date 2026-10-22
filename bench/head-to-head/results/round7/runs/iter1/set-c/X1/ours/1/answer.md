Committed as `eae9820`: `feat(discount): add SPRING15 code and make codes case-insensitive`. I didn't push.

- **What's in it:** `src/discount.js` and `test/discount.test.js`. Your test changes weren't staged, so I staged them to go with the code.
- **Message:** It lists both new tests. It also notes the case-insensitive lookup. That change wasn't in your description, but it's in the diff, so the log should say so. The message includes the plain-language Turkish block from your CLAUDE.md.
- **Tests:** `node --test` gave 4 passed, 0 failed.
- **Not checked:** SPRING15 has no expiry date. The message says the code never expires. `scratch.log` mentions asking Priya about expiry.
- **Left out:** `scratch.log` is still untracked and not committed.