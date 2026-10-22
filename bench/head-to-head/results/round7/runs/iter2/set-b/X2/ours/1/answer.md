Committed `1db0654` with the staged `src/pickup.js` change. It has a bug, and the commit message says so.

- **The bug:** `hasVisitsLeft` uses `>` where the old code used `>=`. A household with 2 visits this month can now book a third. The limit of 2 per month is no longer enforced.
- **Draft note:** `.draft-message.txt` says "No behaviour change. Adds tests." Neither is true. No tests are staged, and the behaviour changed. I did not use the draft and left the file uncommitted.
- **Message:** The "For the customer" block tells the coordinator about the extra visit, so she can decide whether to approve it.
- **Tests:** I did not run them. `package.json` exists, but I did not check for a test script.

The fix is one character: change `>` to `>=` in `hasVisitsLeft`. I did not make it, because you asked me to commit what was staged. I can add the fix and a test as a follow-up commit, or amend this one before anyone approves it.