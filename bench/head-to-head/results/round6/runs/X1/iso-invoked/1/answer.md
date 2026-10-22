Commit `7e5f5df` is made. I did not push.

**What the commit holds**
- **Code:** `src/discount.js` adds `SPRING15` at 15%. It also uppercases the code before lookup, so `spring15` works.
- **Tests:** `test/discount.test.js` adds two tests, one for 15% off and one for case-insensitive lookup. The message lists both.

**Things to know**
- **Test file not staged:** Only `src/discount.js` was staged. Your test changes were unstaged, so I staged and included them. Otherwise the commit would have had no tests.
- **Wider behavior change:** Case-insensitive lookup also applies to `WELCOME10` and `VIP20`. The message says so, because someone reading the log might not expect it.
- **No expiry handling:** `scratch.log` notes you want to ask Priya about expiry dates. The commit says expiry is not implemented.
- **Left out:** `scratch.log` is still untracked and not committed.
- **Tests not run:** I did not run the test suite.

The message body is in English. Per your `CLAUDE.md`, it ends with a short plain-language section in Turkish. I left out the "Otomasyon etkisi" line because this change does not reduce manual work.