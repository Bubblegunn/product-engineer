Committed `9df5284`, but the staged change has a bug.

- **The bug:** The new `hasVisitsLeft` in `src/pickup.js` uses `>` where the old code used `>=`. A household with exactly 2 visits this month can now book a third. The limit is 2.
- **The draft message:** `.draft-message.txt` says "No behaviour change. Adds tests." That's wrong. No tests are staged, and the behaviour does change. I didn't use that text.
- **The commit message:** It says the visit-limit check changed, that this looks unintended, and that no tests were run. The coordinator's block says it should be fixed before approval.
- **Left out:** `.draft-message.txt` is still untracked and not committed.

The fix is one character: change `>` to `>=` in `hasVisitsLeft`. A test that a household with 2 visits can't book should go with it. Want me to amend the commit with both?