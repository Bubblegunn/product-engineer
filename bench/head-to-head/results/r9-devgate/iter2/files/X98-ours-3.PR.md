# Double the free-cancellation window to 48 hours; add guest notes

For the customer:
What changed: Guests can now cancel for free only until 48 hours before check-in, where before it was 24 hours. A booking 30 hours from check-in used to be free to cancel and now is not. Hotel staff can also attach a short note (for example "Late arrival") to a guest's record.
Why it matters: Hotels get two full days' notice to resell a room that is cancelled. Guests get less time to cancel without a charge, so the new 48-hour rule should be visible to them wherever the policy is shown.

## What the diff shows

Range `main..feature`, 3 commits, 5 files.

- **Cancellation window** (`src/policy.js`): `CANCEL_WINDOW_HOURS` goes from 24 to 48. This is a behaviour change, even though it arrives in the commit titled `docs: clarify cancellation policy`. The check itself is still "more than the window away from check-in".
- **Tests** (`test/policy.test.js`): the old "30 hours away can be cancelled free" case is replaced by a 50-hours-away case that expects free, and a new 30-hours-away case that expects not free. The 12-hours case is unchanged.
- **README**: adds one line pointing readers to `src/policy.js` for the window. It does not state the number.
- **Guest notes** (`src/guests.js`, `test/guests.test.js`): new `addNote(guest, text)` returns a copy of the guest with the note appended and leaves the original untouched. One test covers adding a first note. Nothing in the diff calls `addNote` yet, so no screen or workflow uses it.
- **Rename** (`src/policy.js`, commit `refactor: rename helpers`): the local variable `hoursUntil` becomes `hoursBefore` in `canCancelFree`. I read the diff and saw only that rename; the two policy tests that reach that line pass.

## Checked

- Ran `npm test` on `feature` (in a separate checkout of that branch); it printed `ℹ tests 4`, `ℹ pass 4`, `ℹ fail 0`.

## Not checked

- Existing bookings, reminders, emails or screens that quote "24 hours". I did not search the repository for other mentions of the old window.
- Whether any stored booking or export depends on the old window.
- Guest notes are not saved or shown anywhere; I did not check how guest records are persisted.
- The boundary case of exactly 48 hours is not tested (the code treats it as not free).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
