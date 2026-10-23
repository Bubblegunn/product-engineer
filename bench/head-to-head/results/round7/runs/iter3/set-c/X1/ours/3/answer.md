Commit `9f23778` is made: `feat(discount): add SPRING15 code (15% off) and make codes case-insensitive`. Nothing was pushed.

- **Staging:** your test changes were unstaged, so I staged `test/discount.test.js` and included it. The commit has `src/discount.js` and that test file.
- **Message body:**
  - It explains the new code at a 0.15 rate.
  - It notes that codes are now matched case-insensitively for all codes, not only SPRING15. Before this, a lowercase code got no discount.
  - It lists your two tests.
  - It has the plain-language Turkish block from your CLAUDE.md.
- **Tests:** `npm test` gave 4 passed, 0 failed. The message records this.
- **Not checked:** SPRING15 has no expiry date in the code, so it stays valid until someone removes it. The commit message says so.
- **Left out:** `scratch.log` is still untracked and not committed. Its note says to ask Priya about expiry dates, which matches the gap above.