Addresses with a `+` in the local part, like `user@example.com`, now pass validation. I changed the local-part character class in `src/validate.js` to `[A-Za-z0-9._+-]`.

The existing rule that the local part must contain a letter is unchanged, so `user@example.com` is still rejected.

I added two tests in `test/validate.test.js`, one for the `+` case and one for the numeric-with-plus rejection. `npm test` passes 8 of 8. I didn't run `/dod:verify` or do an end-to-end probe against the running API. The README doesn't mention email validation, so there was nothing to update there.