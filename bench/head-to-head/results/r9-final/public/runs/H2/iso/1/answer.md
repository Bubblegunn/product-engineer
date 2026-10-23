`isValidEmail` now accepts `+` addresses like `user@example.com`. The full suite passes (7 tests, 0 failures).

- **Fix:** I added `+` to the allowed characters in the local part of the regex in `src/validate.js`. The rule that the local part must contain a letter is unchanged.
- **Test:** I added `accepts plus addresses` to `test/validate.test.js`.
- **Test command:** `node --test test/` fails, with or without my change, because Node treats `test/` as a module path. Use `node --test`, which finds the test files itself.

I haven't committed anything.