Committed as `31b28b7`: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Nothing was pushed.

- **Test file staged:** only `src/discount.js` was staged. `test/discount.test.js` was modified but unstaged, so I staged it too. Otherwise the message would have mentioned tests the commit didn't contain.
- **Extra change in the diff:** your staged change also made code lookup case-insensitive with `toUpperCase()`. You didn't mention it, so I put it in the message and the commit title. Your second test covers it.
- **Tests:** I ran `node --test test/discount.test.js` and all 4 tests pass.
- **`scratch.log`:** still untracked and not committed.
- **Turkish section:** the body ends with the plain-language "Sade dil" section your CLAUDE.md requires. I left out the "Otomasyon etkisi" line because this change doesn't automate anything.