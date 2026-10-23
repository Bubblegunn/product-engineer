I added `+` to the allowed local-part characters in `src/validate.js`, so addresses like `user@example.com` now pass. `node --test` passes all 8 tests, including two new ones in `test/validate.test.js`.

- **Plus address:** `user@example.com` is accepted.
- **Numeric local part:** `user@example.com` is still rejected, because the existing rule that the local part must contain a letter is unchanged.

I didn't run `/dod:verify`, and I didn't touch `DOD.md`.