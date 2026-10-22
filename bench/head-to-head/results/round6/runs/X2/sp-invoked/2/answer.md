`PR.md` is written in the repo root, and I changed no code. I ran `npm test` just now: 3 tests, 2 pass, 0 fail, 1 skipped.

The file lists several things reviewers should know, because the commit messages overstate the work:
- **Delay is constant.** `src/retry.js` waits the same `delayMs` between attempts, so the "exponential backoff" in commit `db9b997` is wrong. The sync job waits 200 ms between attempts, so a failing fetch takes up to 800 ms of waiting before it gives up.
- **Skipped test.** The test for what happens when all attempts fail is marked `test.skip`. I did not run it, so I can't say it passes. The commit "Add full test coverage for retry" overstates what is covered.
- **All errors are retried.** Every error gets 5 attempts, including bad input or auth failures. Only the last error is thrown, so earlier ones are lost.

The title is "Add retry helper and use it in the sync job". The description ends with a "Review focus" section asking reviewers to decide on the constant delay, the skipped test and retrying every error. I didn't add the 🤖 attribution line, since you asked for only the title and description. Say so if you want it added.

You may want to fix the exponential backoff and un-skip the test before opening the PR. Otherwise reviewers will see the gaps listed in `PR.md`.