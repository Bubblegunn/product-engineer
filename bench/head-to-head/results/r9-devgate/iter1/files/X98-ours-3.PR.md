# Free cancellation now closes 48 hours before check-in; add guest notes

For the customer:
What changed: Guests can now cancel for free until 48 hours before check-in, instead of 24 hours. Hotel staff can also attach notes (for example "Late arrival") to a guest's record.
Why it matters: Hotels get more notice to resell a room that is cancelled. Staff can keep guest details in one place.

## What the diff shows

Three commits, `main..feature`.

- **Cancellation window, 24 to 48 hours** (`src/policy.js`). `CANCEL_WINDOW_HOURS` goes from 24 to 48. This is a real behaviour change: a booking 30 hours from check-in could be cancelled free before and cannot now. The tests were updated to match: a 50-hour booking is free to cancel, a 30-hour booking is not (this one used to be free), and the existing 12-hour test is unchanged.
- **Variable rename** (`src/policy.js`). `hoursUntil` is now `hoursBefore` in `canCancelFree`. I read both lines and the name is changed on each, so the rename itself does not alter the calculation.
- **README** (`README.md`). One line saying free cancellation is defined in `src/policy.js`. It does not state the number of hours.
- **Guest notes** (`src/guests.js`, `test/guests.test.js`). New `addNote(guest, text)` returns a copy of the guest with the note added and leaves the original unchanged. One test covers adding a first note.

## Things to know

- The commit titled `docs: clarify cancellation policy` also changes the window from 24 to 48 hours. The title undersells it; it is not docs-only.
- I found no code in `src/` that calls `addNote`, so it is not yet reachable from anything a user does. I did not trace the rest of the app beyond the files in this diff.
- Existing bookings are judged by the new window as well. I did not check whether anything else (reminders, emails, the CSV export) states "24 hours" in its own text.
- Not tested: adding a second note to a guest who already has notes, and a booking exactly 48 hours away (the check is "more than 48", so that one is not free).

## Testing

ran `npm test` on `feature`: 4 passed, 0 failed
not run: the app itself; nothing was checked in a running system


🤖 Generated with [Claude Code](https://claude.com/claude-code)
