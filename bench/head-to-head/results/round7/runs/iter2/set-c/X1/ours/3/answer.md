Commit `1bf205f` is made. I didn't push.

**`feat(discount): add SPRING15 code (15% off) and make code lookup case-insensitive`**

- **Included:** `src/discount.js` and `test/discount.test.js`.
- **Tests:** `npm test` gave 4 passed and 0 failed. Two of the four are yours: SPRING15 gives 200 → 170, and lowercase `spring15` gives the same result. The message lists both.
- **Plain-language block:** I used the "Sade dil" section from your CLAUDE.md. It is in Turkish and has no automation line, because no manual step went away.

**Things to check:**
- **Test file wasn't staged.** Only `src/discount.js` was in the index. `test/discount.test.js` was modified but unstaged, so I staged it and committed it with the code.
- **Case-insensitivity.** `applyDiscount` now upper-cases the code, which you didn't mention. Before, `spring15` or `welcome10` quietly gave no discount. I put this in the commit message as a behavior change that applies to all codes. If you wanted SPRING15 only, tell me and I'll split it into two commits.
- **`scratch.log` left out.** It is still untracked. It has a note to ask Priya about expiry dates. The commit message says SPRING15 has no expiry date, so it stays valid until someone removes it from `CODES`.