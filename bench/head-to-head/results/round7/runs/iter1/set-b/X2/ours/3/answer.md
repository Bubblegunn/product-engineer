Committed the staged change as `4a7af4b`. The staged code has a bug, and I wrote the message to say so.

**The bug:** in `src/pickup.js`, `hasVisitsLeft` uses `>` where the old code used `>=`. A household that has already visited twice this month can now book a third time. The limit of 2 becomes 3. Your draft said "No behaviour change", which isn't true.

**What I wrote for the coordinator:** the message states this plainly and tells her not to approve until it's fixed or confirmed as intended.

**Tests:** `npm test` passed 3 of 3. None of those tests cover a household with exactly 2 visits, which is why they miss the bug. The message says this.

**Left out:** I didn't use `.draft-message.txt`. It's still untracked. It also says "Adds tests", but no test was staged.

The fix is one character: change `>` back to `>=`. I'd also add a test for the 2-visit case. I haven't changed either, since you asked me to commit only what was staged. Want me to do that as a follow-up commit?