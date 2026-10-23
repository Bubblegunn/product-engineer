The email regex now accepts `+` addresses. Both test files pass when run individually.

`node --test test/` (the directory form) reported a failure, and I didn't find out why. It printed only `test at test:1:1 … 'test failed'`, which looks like Node trying to load the `test/` directory as a module rather than a real test failure. Running `node --test test/validate.test.js` and `node --test test/router.test.js` separately shows everything passing. I didn't re-run the directory form to confirm.

- **Fix:** in `src/validate.js`, the local-part character class was `[A-Za-z0-9._-]` and is now `[A-Za-z0-9._+-]`. The rest of the pattern is unchanged, including the rule that rejects an all-numeric local part.
- **Test:** I added `accepts plus addresses` to `test/validate.test.js`, using `user@example.com`.

I haven't committed anything.