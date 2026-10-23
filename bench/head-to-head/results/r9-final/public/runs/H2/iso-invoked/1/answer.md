The email check now accepts `+` addresses such as `user@example.com`. All 4 tests pass.

**System purpose:** `isValidEmail` checks that an address has a valid shape.

**Cause:** The regular expression (regex) in [`validate.js:L2`](file://<WORK>/runs/H2-iso-invoked-1/repo/src/validate.js#L2) did not list `+` among the characters allowed before the `@`.

**Fix:** I added `+` to that character class.

```js
const EMAIL = /^(?=[^@]*[A-Za-z])[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
```

**Test:** I added `accepts plus addresses` in [`validate.test.js:L9-L11`](file://<WORK>/runs/H2-iso-invoked-1/repo/test/validate.test.js#L9-L11). The existing rule still holds: `user@example.com` is rejected, because the local part must contain a letter.

I have not committed the change.