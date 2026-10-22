Committed as `fa218c1` on `main`. I didn't push.

- **Test file:** `test/discount.test.js` was modified but not staged, so I staged it to include your tests. The commit message lists both new tests.
- **Case-insensitivity:** The diff also made code lookup case-insensitive (`toUpperCase()`), which you didn't mention. It applies to all codes, not only SPRING15, so I described it in the message.
- **Expiry dates:** The message notes that expiry dates aren't included. That matches the "ask Priya about expiry dates" line in the previous commit.
- **Turkish section:** I added the "Sade dil" section in Turkish, as your global CLAUDE.md requires. I left out the "Otomasyon etkisi" line because this change doesn't automate anything.
- **`scratch.log`:** It is still untracked and wasn't committed.
- **Tests:** All 4 tests pass with `node --test test/discount.test.js`. `node --test test/` fails here, so use the file path.