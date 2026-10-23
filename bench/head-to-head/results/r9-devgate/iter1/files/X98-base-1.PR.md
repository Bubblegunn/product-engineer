# Extend free-cancellation window to 48 hours and add guest notes

## Summary

- **Behavior change:** the free-cancellation window in `src/policy.js` goes from 24 to 48 hours before check-in. A booking 30 hours out could be cancelled free before. It now can't.
- **New:** `addNote(guest, text)` in `src/guests.js` returns a copy of the guest record with the note appended to `notes`. It doesn't mutate the stored record.
- **Housekeeping:** the README now points to `src/policy.js` for the cancellation window. A local variable in `canCancelFree` is renamed from `hoursUntil` to `hoursBefore`, with no logic change.

## Things to check

- The commit `docs: clarify cancellation policy` also contains the 24 → 48 change. It is a policy change, not a docs-only one, so please review it as one.
- Bookings made under the 24-hour rule are evaluated against the new 48-hour rule. Anyone between 24 and 48 hours from check-in loses free cancellation. Confirm that is intended, and whether guests or existing bookings need notice.
- `addNote` only returns the updated record. Nothing persists it yet, so callers must save the result.

## Tests

- `test/policy.test.js`: the free-cancellation case now uses a booking 50 hours out. A new case checks that a booking 30 hours out is not free. The existing 12-hour case is unchanged.
- `test/guests.test.js`: new test that `addNote` adds a note to the guest record.

I haven't run the tests.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
