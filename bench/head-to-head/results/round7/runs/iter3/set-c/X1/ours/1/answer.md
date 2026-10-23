Commit `784effe` is done: `feat(discount): add SPRING15 code (15% off) and make code lookup case-insensitive`. I didn't push anything.

- **Included:** `src/discount.js` and `test/discount.test.js`. Your test changes were unstaged, so I staged that file too. The message names both new tests.
- **Left out:** `scratch.log` is still untracked. It holds a note to ask Priya about expiry dates, so it didn't belong in the commit.
- **Test run:** `npm test` passed 4 of 4, 0 failed.
- **Extra change in the commit:** `src/discount.js` now upper-cases the code before lookup, so `spring15` works. You didn't mention this, but your second test needs it. The message explains the change.
- **Not checked:** SPRING15 has no expiry date, so it stays valid until someone removes it. The message says so.
- **Message block:** it ends with a plain-language block in Turkish, "Müşteri için:", as your CLAUDE.md asks.