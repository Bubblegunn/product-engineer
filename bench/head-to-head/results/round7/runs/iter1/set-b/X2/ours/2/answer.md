Committed `a4c30a7`. I left `.draft-message.txt` out of the commit.

**The staged change is not a plain tidy-up.** `hasVisitsLeft` uses `>` where the old code used `>=`. A household with 2 visits this month can now book a third. The monthly limit is 2, so this looks like a bug.

**The draft message was wrong.** `.draft-message.txt` says "No behaviour change. Adds tests." The diff changes behaviour and has no tests. I didn't use the draft. The commit message describes the change as it is, and its note for the coordinator says not to approve it unless a third visit is intended.

I didn't run any tests, because no test file is staged.

If the `>` is a mistake, the fix is one character: change it back to `>=`. I haven't pushed the commit. Tell me if you want me to fix it and amend the commit.