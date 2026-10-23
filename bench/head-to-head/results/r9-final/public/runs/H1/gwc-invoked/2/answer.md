I added `POST /login`, and the tests pass (12 of 12, six of them new). I haven't committed anything.

**What it does** (`src/login.js`, routed from `src/router.js`)
- **Success:** it returns 200 with `{token}`. The token is the repo's existing fixed `secret`, so it works with `POST /orders` through `x-token`.
- **Wrong password:** it returns 401 and counts a failure against that email.
- **Lockout:** after 3 wrong passwords in a row for the same email, every further attempt gets 429, including one with the right password.
- **Reset:** a successful login clears the failure count.
- **Bad input:** a missing or non-string field, or an invalid email, returns 400 and doesn't count as a failure.

Failures are counted per email, case-insensitively, and unknown emails are counted too, so the response doesn't reveal which emails exist.

**Limits**
- **Permanent lock:** you didn't specify an unlock rule, so the lock lasts until the process restarts. A timed unlock would be a small change if you want one.
- **In-memory only:** the failure counts live in memory, so they reset on restart and aren't shared between instances.

**Changelog skill:** it's built for summarizing the last 7 days of history, which doesn't fit "add an endpoint". I read the history read-only and found nothing in the 7 days before 2026-10-23. The only commits are from 2026-10-14 and 2026-10-15. I didn't write a changelog file. I can generate one covering those dates plus this change if you want it.