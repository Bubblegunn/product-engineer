# Free cancellation now needs 48 hours' notice; guest notes helper added

For the customer:
What changed: Guests now have to cancel at least 48 hours before check-in to cancel for free. Before, 24 hours was enough. The README now points to where that window is set.
Why it matters: Hotels get two days to resell a cancelled room. Guests lose a day of free cancelling, so hotels may want to tell guests about the new deadline.

## What the diff shows

- **Cancellation window (`src/policy.js`)**: the free-cancellation window goes from 24 to 48 hours. This is a change in behaviour, even though the commit that carries it is titled `docs: clarify cancellation policy`. A booking 30 hours from check-in could be cancelled free before and can't now.
- **Variable rename (`src/policy.js`)**: a local variable is renamed from `hoursUntil` to `hoursBefore`. I read the diff and the calculation is the same expression. The commit is titled `refactor: rename helpers`, but only this one variable is renamed.
- **Tests (`test/policy.test.js`)**: the old "30 hours away" test is rewritten to a 50-hour booking that can be cancelled free. A new test says a 30-hour booking can't. The existing 12-hour test is unchanged.
- **README**: one line saying where to find the free-cancellation window. It names the file and doesn't state the number, so it won't go stale.
- **Guest notes (`src/guests.js`, `test/guests.test.js`)**: a new `addNote` function returns a copy of a guest record with a note added. Nothing else in the code calls it yet, so guests and staff can't see or use notes after this change. It has one test, for adding a first note. I did not test adding a second note to an existing list.

## Checked

ran `npm test`: 4 passed, 0 failed (on `feature`)
not checked: nothing was run in the real app. Existing bookings, reminders and any guest-facing text that quotes "24 hours" were not searched for. The cancellation window is the only place I know of where the number lives.

## For the reviewer

- Please confirm the 48-hour window is intended. The commit title describes it as a docs change.
- The unrelated pieces (window change, rename, guest notes) could be split into separate PRs if you prefer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
