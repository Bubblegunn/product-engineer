The email check now accepts `+` addresses such as `user@example.com`. All 4 tests in `test/validate.test.js` pass.

**System purpose:** `isValidEmail` checks that an address has a valid shape.

**Cause:** The local-part character class (the text before `@`) did not include `+`. I added it in [validate.js:2](file://<WORK>/runs/H2-iso-invoked-3/repo/src/validate.js#L2):

```js
const EMAIL = /^(?=[^@]*[A-Za-z])[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
```

The rule that the local part must contain a letter still applies, so `user@example.com` is still rejected.

**Test:** I added `accepts plus addresses` in [validate.test.js:9](file://<WORK>/runs/H2-iso-invoked-3/repo/test/validate.test.js#L9-L11).

**Not checked:** `node --test test/` failed with a generic error, but running the file directly passed. I did not run the router tests or the full `npm test` suite.