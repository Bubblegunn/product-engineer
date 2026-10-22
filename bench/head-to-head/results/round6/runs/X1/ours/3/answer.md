Commit `304e905` is made on `main`. I did not push.

- **Included:** `src/discount.js` and `test/discount.test.js`. Your test changes were unstaged, so I staged that file to put the tests in the same commit.
- **Left out:** `scratch.log`. It is still untracked. It contains a note to ask Priya about expiry dates.
- **Test run:** `npm test` gave 4 passed, 0 failed.
- **Message:** The message says what changed and lists the two new tests. It also has a plain-language "Sade dil" block in Turkish, per your CLAUDE.md. I left out the "Otomasyon etkisi" line because no manual step went away.
- **Case-insensitive codes:** `applyDiscount` now upper-cases the code, so `WELCOME10` and `VIP20` are also case-insensitive now. The message says so.
- **Expiry:** The message notes that SPRING15 has no expiry date implemented.