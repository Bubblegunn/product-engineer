Commit `e5a10c7` is in place: `feat(discount): add SPRING15 code and make codes case-insensitive`. I did not push. I did not run the tests.

- **Test file:** `test/discount.test.js` was modified but not staged. I staged it so your tests ship with the code.
- **`scratch.log`:** I left it untracked and out of the commit.
- **Extra behavior change:** The diff also makes every code case-insensitive, not only SPRING15. A lowercase `welcome10` now gets its discount, where before it got none. I named this in the message so the log shows it.
- **Message contents:** The body covers the new code, the case-insensitive lookup, and your two tests. It also has the plain-language section in Turkish that your CLAUDE.md requires, and the Co-Authored-By line.