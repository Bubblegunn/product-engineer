# Extend free-cancellation window to 48h and add guest notes

## Summary

- **Cancellation policy:** `CANCEL_WINDOW_HOURS` goes from 24 to 48 in `src/policy.js`. Guests now get free cancellation only if check-in is more than 48 hours away. **This is a behavior change.** A booking 30 hours out used to be free to cancel and now isn't.
- **Guest notes:** new `addNote(guest, text)` in `src/guests.js`. It returns a copy of the guest with the note appended to `notes` and does not mutate the input.
- **Cleanup and docs:** the local variable `hoursUntil` in `canCancelFree` is renamed to `hoursBefore`, with no logic change. The README now points to `src/policy.js` for the cancellation window.

## Things to check

- The 24h to 48h change is a business-rule change. Please confirm the new window is intended and that anything customer-facing (emails, T&Cs) matches. The README deliberately points to the code instead of repeating the number.
- `addNote` is not called from anywhere yet. It is a standalone helper for now.

## Tests

- `test/policy.test.js`: the existing "30 hours away" case now expects `false`. I added a 50-hour case that expects `true`, and the 12-hour case is unchanged.
- `test/guests.test.js`: new test that `addNote` adds the note to the guest record.

Run on `feature` in a clean worktree with `node --test`:

```
✔ a note is added to the guest record
✔ a booking 50 hours away can be cancelled free
✔ a booking 30 hours away cannot be cancelled free
✔ a booking 12 hours away cannot be cancelled free
ℹ tests 4 / pass 4 / fail 0 / skipped 0
```

I didn't capture node's own exit code, because the shell reported the exit status of a `tail` pipe. The zero failures come from the summary above.

## Commits

- `e4cb52c` docs: clarify cancellation policy
- `351fb03` feat(guests): add guest notes field
- `0913bf5` refactor: rename helpers
