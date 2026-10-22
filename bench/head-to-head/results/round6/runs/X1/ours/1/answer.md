Commit `9204085` is made on `main`. Nothing was pushed.

**Message:** `feat(discount): add SPRING15 code (15% off) and make codes case-insensitive`

The body covers:
- **Code change:** SPRING15 was added, and codes are now upper-cased before lookup. That change also applies to WELCOME10 and VIP20.
- **Tests:** it lists your two new tests.
- **Test result:** `ran npm test: 4 passed, 0 failed`.
- **Plain-language section:** I wrote it in Turkish, following your CLAUDE.md "Sade dil" format. I left out the automation line because the change removes no manual step.

**Files:**
- **Test file:** `test/discount.test.js` was modified but not staged, so I staged it and committed it together with `src/discount.js`.
- **`scratch.log`:** I left it out and it is still untracked. It isn't a secret. It holds your note to ask Priya about expiry dates.

**Expiry:** SPRING15 has no end date in the code. I recorded this in the commit body as not checked.