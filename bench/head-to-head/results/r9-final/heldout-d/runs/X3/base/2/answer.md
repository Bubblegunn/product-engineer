I wrote `RELEASE_NOTES.md`. I based it on the actual diff between v1.2.0 and v1.3.0, not only the commit messages. Three things in the repo don't match those messages:

- **Timeout:** The commit says the default timeout went to 60s. The code sets it to 45s (up from 30s), so the notes say 45s. If 60s was the intent, the code is wrong.
- **Option rename:** The `maxItems` to `limit` rename is a breaking change, and the old name has no alias. The commit message ("tidy option names") undersells it, so I put it first in the notes under "Action required".
- **CSV export:** It was added and then reverted, so it isn't in v1.3.0. The README still says "Supports CSV export of reports," which is wrong for this release. The notes say CSV export isn't included. You may want to fix the README, which is already in the tagged release.

I haven't committed the file.