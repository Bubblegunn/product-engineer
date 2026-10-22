I wrote `PR.md` in the repo root. I didn't change any code.

The title is "Add retry helper and use it in the sync job". The description follows the ISO 24495 skills you named. It opens with a purpose line, the intended reader and a date, then an overview, and the detail sits in later sections. Each code reference links to a file and line range.

I ran `node --test` on the branch: 3 tests, 2 passed, 0 failed, 1 skipped. Two things in the commit history don't match the code, so `PR.md` states the facts instead:

- **"Exponential backoff":** the helper waits a fixed `delayMs` between attempts. The delay never grows.
- **"Full test coverage":** the test for "all attempts fail" is marked `test.skip`. Nothing checks that the helper gives up and throws.

`PR.md` also notes two behaviour changes:

- **Sync job:** it now makes up to 5 calls with 800 ms of total waiting before it fails. It used to make 1 call.
- **Retries:** the helper retries every error, including permanent ones.

The last section lists three decisions for reviewers: whether to enable the skipped test, how to handle the backoff naming, and whether to limit which errors are retried. I did not rename the commits or fix any of these. Before you open the PR, you may want to reword those two commit messages or settle these points.