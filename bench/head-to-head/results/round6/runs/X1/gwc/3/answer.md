Commit `f8c9523` is made locally. Nothing was pushed.

**Message:** `feat(discount): add SPRING15 code and make code lookup case-insensitive`

The body covers:
- Adding SPRING15 at 15%.
- The case-insensitive lookup, which now applies to all codes. I included this because it's in your diff and changes behavior for WELCOME10 and VIP20 too.
- The two new tests.

It also has the plain-language Turkish section from your CLAUDE.md, without the automation line since this doesn't add any. It ends with the Co-Authored-By line.

- **Test file:** `test/discount.test.js` was modified but not staged, so I staged it and included it in the commit. Only `src/discount.js` had been staged.
- **`scratch.log`:** I left it untracked and out of the commit.
- **Tests:** My first run, `node --test test/`, failed. I had passed it a directory, so the commit went ahead anyway. I then ran `node --test test/discount.test.js` and all 4 tests pass.