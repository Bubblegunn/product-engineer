Commit `7bd5bfc` is made, but the staged change is not a pure tidy-up, and the commit message says so.

- **Behaviour change:** while splitting the booking check into helpers, the visit-limit test went from `>=` to `>`. A household with exactly 2 visits this month can now book a third. Before, it was refused. This looks like a bug.
- **Draft message:** I did not use `.draft-message.txt`. It says "No behaviour change. Adds tests", but the staged diff changes behaviour and has no tests. The file is still untracked and not committed.
- **Tests:** `npm test` passed 3 of 3. None of them uses a household with 2 visits, so they don't catch the change.
- **Not checked:** I did not change the code or add a test, because you asked me to commit what was staged. The message tells the coordinator not to approve it as a "no change" tidy-up.

Do you want a follow-up commit that restores `>=` and adds a test for the 2-visit case?