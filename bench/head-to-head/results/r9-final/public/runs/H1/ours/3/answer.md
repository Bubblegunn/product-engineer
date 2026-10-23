`POST /login` is in place, and the lockout works the way you described. I ran the full suite and all 11 tests pass. That includes the 5 new login tests, which call the handler directly, not through a running server.

- **Success:** `{email, password}` with the right credentials returns 200 and `{token}`.
- **Failure:** a wrong password returns 401, and a missing or non-string email or password returns 400.
- **Lockout:** after 3 wrong passwords in a row for the same email, every later attempt returns 429, even with the right password. A successful login before the third failure resets the count.
- **Scope:** locks are tracked per email, case-insensitively, so `Ana@…` can't get around a lock on `ana@…`. Unknown emails are counted too, so a 429 doesn't reveal which accounts exist.

The lockout logic is in the new `src/auth.js`, and the route is in `src/router.js`.

- **Token:** the token is the same fixed `'secret'` value `/orders` already checks, since the codebase has no real token system yet. I checked that a token from `/login` is accepted by `/orders`. Replacing it with per-login tokens would be a separate change.
- **Locks are permanent:** lock state lives in memory, so it clears on restart. There is no timed expiry or manual unlock, because you didn't ask for one. A user who gets locked out stays locked until the process restarts, so you'll probably want an expiry window.

I haven't committed anything.