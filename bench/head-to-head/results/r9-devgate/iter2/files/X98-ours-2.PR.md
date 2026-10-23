# Free cancellation now closes 48 hours before check-in; add guest notes

For the customer:
What changed: Guests can now cancel for free only until 48 hours before check-in, instead of 24 hours. Hotel staff can also attach notes (for example "Late arrival") to a guest's record.
Why it matters: Hotels get two full days' notice to resell a cancelled room, and staff can keep guest details in one place.

## What the diff shows

- **Cancellation window 24 → 48 hours** (`src/policy.js`). This is a behaviour change, even though the commit that carries it is titled `docs: clarify cancellation policy`. A booking 30 hours from check-in could be cancelled free before this change and cannot now. Please review it as a policy change, not as documentation.
- **Tests for the window** (`test/policy.test.js`). The old "30 hours away can be cancelled free" test is replaced by a 50-hour case that can be cancelled free and a 30-hour case that cannot. The 12-hour case is unchanged.
- **README** (`README.md`). Adds one line pointing readers to `src/policy.js` for the window. It does not state the number, so it will not go stale.
- **Guest notes** (`src/guests.js`, `test/guests.test.js`). New `addNote` returns a copy of the guest with the note appended and leaves the stored record alone. One test covers adding a first note. Nothing in this diff calls `addNote`, so staff cannot use it yet; I did not check for a caller outside this range.
- **Variable rename** (`src/policy.js`, commit `refactor: rename helpers`). I read the diff: a local variable changes from `hoursUntil` to `hoursBefore`, and the calculation and comparison are the same expression. Nothing else in the range was traced for that commit.

## Checked

Ran `node --test` on `feature`: 4 passed, 0 failed.

Not checked: existing bookings and any already-sent guest messages that mention a 24-hour window, and whether any other file reads `CANCEL_WINDOW_HOURS`.

## Not in this PR

- No screen or workflow for adding guest notes.
- No notice to guests about the new window.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
