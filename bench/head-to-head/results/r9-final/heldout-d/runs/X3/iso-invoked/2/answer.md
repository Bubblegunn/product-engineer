I wrote `RELEASE_NOTES.md` in the repo root. I haven't committed it.

I based the notes on the actual diff between `v1.2.0` and `v1.3.0`, not on the commit messages. Four things in the repo don't match what you might expect:

- **Timeout:** One commit message says "increase default timeout to 60s", but the code sets `timeoutMs: 45000`. The notes say 45 seconds.
- **CSV export:** It was added and then reverted, so it isn't in the release. The `README.md` still says "Supports CSV export of reports", which is wrong. The notes tell customers CSV export isn't available. You may want to fix the README.
- **Breaking rename:** `maxItems` became `limit`, which the commit log calls "tidy option names". The notes lead with this as a breaking change. Code that still passes `maxItems` silently falls back to the default limit of 100.
- **Retry limits:** `withRetry` only catches errors thrown synchronously, so it won't retry a rejected promise. `fetchAll` also doesn't call it for you. The notes say both.

`package.json` still says version `1.2.0` at the `v1.3.0` tag. You may want to bump it.

I applied the ISO 24495-1, -3 and -5 skills. I left out -2 because these notes aren't legal text.