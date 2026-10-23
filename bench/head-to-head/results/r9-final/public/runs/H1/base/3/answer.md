I added `POST /login`, and all 11 tests pass (the 5 new ones plus the 6 that were already there). I haven't committed anything.

- **Route:** the logic is in `src/login.js` and `src/router.js` calls it. A successful login returns 200 with `{token}`.
- **Token:** it's the same fixed `'secret'` that `requireAuth` already checks, so the returned token works on `POST /orders`. A real per-session token would be a separate change.
- **Lockout:** after 3 wrong passwords in a row for an email, the next attempt gets 429, even with the right password. A successful login before that resets the count. Emails are matched case-insensitively for locking, so `ANA@…` can't get around it. Unknown emails are counted too, so the response doesn't reveal which accounts exist.
- **Bad input:** a missing or non-string email or password returns 400 and doesn't count as a failed attempt.
- **Tests:** `test/login.test.js` covers the cases above, plus the per-email lock and the count reset.

The lock lasts until the process restarts, because the failure counts are only in memory and nothing unlocks an account. You didn't specify an unlock rule. A timed expiry would be a small addition, so tell me if you want one.