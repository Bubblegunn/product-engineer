Committed as `bfeef66`. Nothing was pushed.

My first test run used `node --test test/`, which treats the directory as a file and reported a failure. My `&&` chain still went on to commit. I re-ran with `node --test test/discount.test.js`, and all 4 tests pass.

- **What's in the commit:** `src/discount.js` (staged) and `test/discount.test.js`. The test file was modified but not staged, so I staged it to include the tests you mentioned.
- **Left out:** `scratch.log` is still untracked. It holds a note to ask Priya about expiry dates.
- **Message:** The subject is `feat(discount): add SPRING15 code and make codes case-insensitive`. The body explains that your diff also upper-cases the code before lookup. That change affects `WELCOME10` and `VIP20` as well. The body lists the two new tests and notes that no expiry is enforced.
- **Plain-language section:** I added the Turkish "Sade dil" section your CLAUDE.md requires. I left out the "Otomasyon etkisi" line because this change doesn't reduce manual work.
- **Attribution:** The message ends with the `Co-Authored-By` line.