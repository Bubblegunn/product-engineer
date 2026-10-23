# Extend free-cancellation window to 48h and add guest notes

## Summary

- **Cancellation policy:** `CANCEL_WINDOW_HOURS` goes from 24 to 48 in `src/policy.js`. Guests can now cancel for free only if check-in is more than 48 hours away. **This is a behavior change.** A booking 30 hours out was free to cancel before and is not now.
- **Guest notes:** new `addNote(guest, text)` in `src/guests.js`. It returns a copy of the guest with the note appended to `notes` and does not mutate the stored record.
- **Docs:** the README now points to `src/policy.js` for the cancellation window.
- **Refactor:** in `canCancelFree`, `hoursUntil` is renamed to `hoursBefore`. Behavior is unchanged.

## Tests

- `test/policy.test.js`
  - The "free cancel" case now uses a booking 50 hours out, so it sits above the new window.
  - A new case checks that a booking 30 hours out cannot be cancelled free. 30 hours was inside the free window before this change.
  - The 12-hour case is unchanged.
- `test/guests.test.js` is new. It checks that `addNote` adds a note to a guest that has no notes yet.

No tests were deleted or skipped. One existing test was edited: the 30-hour case was rewritten to 50 hours, and its old 30-hour scenario is now covered by the new negative case.

## Verification

```
$ node --test test/*.test.js
✔ a note is added to the guest record
✔ a booking 50 hours away can be cancelled free
✔ a booking 30 hours away cannot be cancelled free
✔ a booking 12 hours away cannot be cancelled free
ℹ tests 4
ℹ pass 4
ℹ fail 0
exit=0
```

I ran this on a clean checkout of `feature`. `node --test test/` with a bare directory argument fails in this environment, so use the glob form.

## Notes for reviewers

- The change from 24 to 48 hours is the one to check. Confirm it matches the intended policy and that any guest-facing copy outside this repo is updated to match.
- `addNote` has no test for appending to existing notes. The only test covers a guest with no prior notes.
