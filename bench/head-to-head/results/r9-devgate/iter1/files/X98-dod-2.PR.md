## Extend free-cancellation window to 48h and add guest notes

### Changes

**Cancellation policy (behavior change)**
- `CANCEL_WINDOW_HOURS` in `src/policy.js` goes from **24 to 48**. Guests must now cancel more than 48 hours before check-in to cancel for free. A booking 30 hours out was previously free to cancel and no longer is.
- Renamed the local `hoursUntil` to `hoursBefore` in `canCancelFree`. No logic change.
- README now points to `src/policy.js` for the free-cancellation window.

**Guest notes**
- New `addNote(guest, text)` in `src/guests.js`. It returns a copy of the guest with the note appended to `notes` and does not mutate the input record.
- `addNote` is not imported anywhere else yet, so nothing in the app calls it.

### Tests
- `test/policy.test.js`: the "30 hours away" case now expects `false`. I added a 50-hour case that expects `true`, and kept the 12-hour case.
- `test/guests.test.js`: new test that `addNote` adds a note to a guest with no existing notes.

Not covered: appending to existing notes, and the input record staying unmodified.

### Verification
Ran `node --test` on the `feature` branch: 4 tests, 4 pass, 0 fail, 0 skipped. I did not run an end-to-end probe, because `addNote` has no caller and the policy change is a pure function covered by the unit tests.

### Review notes
- The commit `e4cb52c docs: clarify cancellation policy` is the one that changes the window from 24 to 48. Its message describes a docs change, so the 24→48 change is easy to miss when reading the log. Reviewers should confirm 48h is the intended policy.
- The README only says to see `src/policy.js`, so it doesn't hardcode the number and won't go stale.
