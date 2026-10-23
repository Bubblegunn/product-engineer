I wrote `RELEASE_NOTES.md` from the actual v1.2.0→v1.3.0 diff, not from the commit messages. I didn't commit it, and I didn't run the tests or the code.

The notes cover four things:
- **Breaking rename:** `maxItems` is now `limit`. If a caller still passes `maxItems`, the library ignores it without an error and returns up to 100 items. The notes put this first, with a before and after example.
- **`withRetry` helper:** It allows 3 attempts in total and doesn't wait between them. `fetchAll` doesn't call it, so callers have to wrap their own calls.
- **Longer default timeout:** The default is now 45 seconds, up from 30.
- **CSV export:** It is not in this release.

Two things in the repo don't match each other, and you may want to fix them:
- **Timeout:** The commit message says the timeout went to 60s, but `src/config.js` sets 45000 ms. I wrote 45 seconds because that is what the code does. If you meant 60, the code is wrong.
- **README:** It says "Supports CSV export of reports", but that feature was added and then reverted. The release notes tell customers it isn't available. The README line should probably be removed.

I applied the plain-language guidance from skills 1 and 3, plus a light pass of 5 for the document layout. I skipped skill 2 because this isn't legal text.