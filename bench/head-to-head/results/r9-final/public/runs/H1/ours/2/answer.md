`POST /login` now exists and enforces the lockout. All 12 tests pass, including 6 new ones in `test/login.test.js`. I ran them through the router in-process, not against a running server.

- **Login:** `{email, password}` with correct credentials returns `200 {token}`. A wrong password returns `401`. A missing or non-string email or password returns `400`.
- **Lockout:** after 3 wrong passwords in a row for an email, every later attempt for it returns `429`, even with the right password. A successful login resets the count, so 2 wrong attempts then a success starts over. One email's lockout doesn't affect another. Emails that don't exist are counted the same way, so the 429 doesn't reveal which accounts exist.
- **Tokens:** `requireAuth` now accepts tokens issued by `/login` as well as the existing fixed `secret` token. Without that, a login token would be rejected by `/orders`. I left the fixed token in so the existing behaviour and tests don't change.

The files are `src/auth.js` (new) and `src/router.js`.

**Things you didn't specify:**
- **Lock duration:** a lock never expires. Failure counts, locks and tokens are all held in memory, so a server restart clears them. If you want locks to expire after a set time or be cleared by an admin, say so and I'll add it.
- **Lockout as an attack:** because locks are permanent, anyone can lock a known account by guessing wrong three times.
- **Persistence:** I didn't add persistent storage for any of this.

I haven't committed anything.