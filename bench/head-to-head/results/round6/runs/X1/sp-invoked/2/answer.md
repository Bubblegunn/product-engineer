Commit `99c4c16` is made. I did not push.

- **Tests:** `npm test` ran before the commit and all 4 tests passed.
- **Staging:** Only `src/discount.js` was staged. `test/discount.test.js` had unstaged changes, so I added it to the commit.
- **`scratch.log`:** I left it out. It is still untracked.
- **Extra behavior change:** Your diff also makes code lookup case-insensitive, and this applies to every code. Before, `welcome10` got no discount. Now it does. The commit message says so, so check that this is what you wanted.
- **Message format:** It follows your CLAUDE.md rule. It has an English conventional-commit title and body, then the plain-language Turkish section, then the Co-Authored-By line. I left out the "Otomasyon etkisi" line because this change doesn't automate anything.