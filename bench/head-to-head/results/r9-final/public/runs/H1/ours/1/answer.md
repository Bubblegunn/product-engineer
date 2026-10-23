I added `POST /login` in `src/router.js`. All 12 tests pass, including 6 new ones in `test/login.test.js`. I only ran it through the router's `handle` function and the tests. I didn't start a server.

- **Success:** `{email, password}` with valid credentials returns 200 and `{token: "secret"}`. That is the one token `/orders` accepts in this sample, and a test confirms it works there.
- **Bad input:** a missing or non-string email or password returns 400.
- **Wrong password:** returns 401.
- **Lockout:** after 3 wrong passwords in a row for the same email, every later attempt for it returns 429, even with the right password. A successful login before that resets the count. Locks are per email, ignoring case and surrounding spaces.

Things you might not expect:
- **Lock never expires:** the lock lasts until the process restarts. You didn't specify an unlock rule, so I didn't invent one. A timed expiry would be a small change.
- **State is in memory:** the failure counts reset on restart and aren't shared across multiple instances.
- **Unknown emails also lock:** this stops the 401 and 429 responses from revealing which emails are registered. It also means someone can lock out an address by guessing wrong passwords for it.
- **Test helper:** I exported `resetLogins` so tests can clear the counts.

I haven't committed anything.