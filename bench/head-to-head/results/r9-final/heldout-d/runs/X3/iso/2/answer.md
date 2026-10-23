I wrote `RELEASE_NOTES.md`. It covers the changes between v1.2.0 and v1.3.0. I compared the code at the two tags, not just the commit messages, and found three problems:

- **Timeout:** the commit message says the default timeout went to 60s, but the code sets 45s. The notes say 45 seconds, because that is what customers get.
- **Renamed option:** `maxItems` became `limit` with no fallback, so existing callers lose their limit without any error. I put this first in the notes as an action-required item. You may want to call it a breaking change or bump the version accordingly.
- **Stale README:** it says fetchkit "supports CSV export of reports". The CSV export was added and then reverted inside this range, so v1.3.0 doesn't have it. The notes say it isn't included. The README line is still wrong and needs fixing.

I didn't commit anything.