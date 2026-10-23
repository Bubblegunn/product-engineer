The email check now accepts `+` addresses such as `user@example.com`. All 7 tests pass.

**System purpose:** `isValidEmail` checks that an address has a valid shape before the app accepts it.

**Implementation detail:**
- **Cause:** The local part (the text before `@`) allowed only letters, digits, `.`, `_` and `-`, so a `+` failed the match.
- **Fix:** I added `+` to that character class in [`validate.js:L2`](file://<WORK>/runs/H2-iso-invoked-2/repo/src/validate.js#L2):

```js
const EMAIL = /^(?=[^@]*[A-Za-z])[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
```

- **Test:** I added `accepts plus addressing` in [`validate.test.js:L9-L11`](file://<WORK>/runs/H2-iso-invoked-2/repo/test/validate.test.js#L9-L11).
- **Unchanged rule:** The letter requirement still holds, so `user@example.com` is rejected. A local part made only of `+` and digits, such as `user@example.com`, is rejected for the same reason.

I haven't committed the change.