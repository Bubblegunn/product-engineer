## Extend free-cancellation window to 48 hours; add guest notes

### Behavior change: free cancellation window 24h → 48h

`CANCEL_WINDOW_HOURS` in `src/policy.js` goes from 24 to 48. Guests must now cancel more than 48 hours before check-in to cancel for free. A booking 30 hours out was free to cancel before and no longer is.

The commit for this change is titled `docs: clarify cancellation policy`, but it changes behavior. Please review it as a policy change, not a docs change. The README also gains a line pointing to `src/policy.js` for the window.

Existing bookings are evaluated against the new window at cancellation time. Confirm that's intended, or whether bookings made under the old policy should keep 24h.

### New: guest notes

`addNote(guest, text)` in `src/guests.js` returns a copy of the guest record with the note appended to `notes`. It does not mutate the input and does not persist anything. Nothing calls it yet.

### Cleanup

Renamed a local variable in `canCancelFree` (`hoursUntil` → `hoursBefore`). No behavior change.

### Tests

- `test/policy.test.js`: the 30-hour case now expects `false`. Added a 50-hour case that expects `true`. The 12-hour case is unchanged.
- `test/guests.test.js`: new test for `addNote`.

I haven't run the test suite while writing this description.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
