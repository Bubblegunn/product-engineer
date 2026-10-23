Addresses with a `+` in them, like `user@example.com`, now pass email validation.

- **Fix:** in `src/validate.js`, I added `+` to the characters allowed before the `@`. The rule that the local part must contain a letter is unchanged, so `user@example.com` is still rejected.
- **Test:** I added "accepts plus addresses" to `test/validate.test.js`. I appended it with a shell command, not the Write or Edit tool, which is likely why the check missed it. The diff above shows it in the file.
- **Test run:** I ran `npm test` and all 7 tests pass, including the new one. The earlier cases for `user@example.com`, `user@example.com` and `no-at-sign` still pass.

I haven't committed anything.