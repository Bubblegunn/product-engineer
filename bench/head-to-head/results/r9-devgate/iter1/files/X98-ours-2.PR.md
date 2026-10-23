## Free cancellation window widened from 24 to 48 hours; guest notes added

For the customer:
What changed: Guests now have until 48 hours before check-in to cancel for free, instead of 24 hours. Hotel staff can also attach notes (for example "Late arrival") to a guest's record.
Why it matters: Guests get more time to change their plans, and staff can keep guest details in one place.

## What the diff shows

**Cancellation window (`src/policy.js`, `test/policy.test.js`)**
- `CANCEL_WINDOW_HOURS` goes from 24 to 48. This is a behaviour change: a booking 30 hours from check-in could be cancelled free before and cannot now.
- In the same file, a local variable is renamed (`hoursUntil` to `hoursBefore`). I read the two lines; the calculation and the comparison are the same text apart from the name.
- Tests: the "30 hours away" case now expects `false`, a new "50 hours away" case expects `true`, and the "12 hours away" case is unchanged.

**Guest notes (`src/guests.js`, `test/guests.test.js`)**
- New `addNote(guest, text)` returns a copy of the guest record with the note appended and leaves the original record unchanged. One test checks that a note appears on the returned record.
- Nothing in the diff calls `addNote` yet, so staff cannot use it from the app until it is wired up. I did not look for other callers outside this range.

**Docs (`README.md`)**
- One line pointing readers to `src/policy.js` for the free-cancellation window. It does not state the number, so it will not go stale again.

## Checked

- Ran `node --test test/*.test.js` on the `feature` branch in a separate checkout: 4 passed, 0 failed.
- Not checked: the app itself, existing bookings, or any text shown to guests or hotels that may still say 24 hours. I did not search for other mentions of the old window.
- Not covered by tests: that `addNote` leaves the original record unchanged, and a booking exactly 48 hours out.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
