I made three commits, because your staged changes covered three unrelated pieces of work. The working tree is clean.

1. **`8a9710c` fix(price): clamp discount percent to 0-100**
   - It changes `src/price.js` and adds the new `test/price.test.js`, which was untracked, so it wasn't in your staged set.
   - A discount over 100% now makes the item free instead of giving a negative price. A negative discount no longer raises the price.
2. **`d0c51f2` chore(format): remove leftover debug log from `money()`**
   - It removes the `console.log('money called', …)` line from `src/format.js`.
3. **`3f3c311` chore: bump version to 1.4.3**
   - It changes `package.json` only.

Each message ends with a plain-language "For the customer" block and the co-author line.

I ran `npm test` before committing and saw 4 passed, 0 failed. The tests cover money formatting, a discount over 100%, a negative discount, and a 10% discount. I ran them once on the combined staged state, not separately for each commit, so I didn't check the two chore commits on their own.

No staged file looked like a secret, so nothing was unstaged for that reason.