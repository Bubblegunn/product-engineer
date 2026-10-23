Commit `6e80001` is made, but the staged change has a bug. I wrote the message to say so instead of using your draft.

- **The bug:** `hasVisitsLeft` in `src/pickup.js` now uses `>` where the old code used `>=`. A household with 2 visits this month can now book a 3rd, against the limit of 2. I did not fix it, because you asked me to commit what was staged.
- **Your draft:** `.draft-message.txt` said "No behaviour change. Adds tests." That is wrong on both counts. The change alters behaviour, and no test file is staged. I left that file uncommitted.
- **Tests:** I ran none and noted "not run" in the message.
- **The "For the customer" block:** It tells the pantry coordinator the visit limit is not enforced correctly, so she should not approve it as is.

To fix it, change `>` back to `>=` in `hasVisitsLeft`, add a test for a household with exactly 2 visits, and amend the commit. I can do that if you want.