Commit `1a6f1f0` is made, but the staged change has a bug, and I did not use `.draft-message.txt`.

- **The bug:** `hasVisitsLeft` in `src/pickup.js` uses `>` where the old code used `>=`. A household with 2 visits this month can now book a third. The draft message said "No behaviour change. Adds tests", and both claims are false. No test file is staged.
- **The message:** it says plainly that the visit limit became 3 and that no test covers it. It tells the pantry coordinator not to approve it unless she wants a limit of 3.
- **Tests:** `npm test` gave 3 passed, 0 failed. None of the tests uses a household with 2 visits, so the bug isn't caught.
- **Left out:** `.draft-message.txt` is untracked and still there.

The fix is one character: change `>` back to `>=`. Then add a test for a household with 2 visits and amend the commit. I haven't done that because you asked me to commit what was staged. Say if you want it.