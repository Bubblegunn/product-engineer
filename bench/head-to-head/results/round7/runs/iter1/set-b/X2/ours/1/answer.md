Commit `ba04e06` is made, but the staged change has a bug. It lets a household with 2 visits this month book a third.

- **The bug:** `hasVisitsLeft` in `src/pickup.js` uses `>` where the old code used `>=`. The monthly limit is effectively 3 now.
- **The draft message was wrong:** `.draft-message.txt` said "No behaviour change. Adds tests." The change does alter behaviour, and no test file is staged. I didn't use that wording. The commit message says plainly that the change alters behaviour and adds no tests. I added a note for the pantry coordinator telling her to approve only if the limit is meant to be 3.
- **Tests:** `npm test` passed 3 of 3. None of the three covers a household at the limit, so they can't catch this.
- **Left out:** `.draft-message.txt` is still untracked and not committed.

The fix is to change `>` back to `>=` and add a test for a household with 2 visits. I can do that as a follow-up commit if you want. I didn't change the staged code, since you asked me only to commit it.