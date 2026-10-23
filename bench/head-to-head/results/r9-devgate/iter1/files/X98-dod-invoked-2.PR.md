# Extend free-cancellation window to 48h, add guest notes, rename helper variable

Range: `main..feature` (3 commits)

## Summary

- **Behavior change: free cancellation window goes from 24h to 48h** (`CANCEL_WINDOW_HOURS` in `src/policy.js`). A booking 30 hours from check-in used to be free to cancel and now is not. This change is in the commit titled `docs: clarify cancellation policy`, whose title understates it. Please review it as a policy change.
- Add `addNote(guest, text)` in `src/guests.js`. It returns a new guest object with the note appended and does not mutate the input.
- Rename a local variable in `canCancelFree` (`hoursUntil` to `hoursBefore`). No behavior change.
- README now points to `src/policy.js` for the cancellation window.

## Commits

- `e4cb52c` docs: clarify cancellation policy. It changes the window from 24 to 48, updates the README, and rewrites the policy tests.
- `351fb03` feat(guests): add guest notes field
- `0913bf5` refactor: rename helpers

## Tests

- `policy.test.js`: the old "30 hours away can be cancelled free" test was changed. It now uses 50 hours, and a new test asserts that 30 hours is not free. This is an intentional expectation change that follows the policy change, not a deleted test.
- `guests.test.js`: new test for `addNote`.
- `npm test` on `feature`: 4 tests, 4 pass, 0 fail, 0 skipped.

## E2E probe

```
$ node -e "const p=require('./src/policy');console.log(p.CANCEL_WINDOW_HOURS,p.canCancelFree({checkIn:'2026-10-21T16:00:00Z'},new Date('2026-10-20T10:00:00Z')))"
48 false
```

## Notes for reviewers

- Confirm the 48h window is the intended business policy. Anyone with a booking 24 to 48 hours out loses free cancellation. Consider whether existing bookings should be grandfathered.
- `addNote` has no docstring-level validation of `text`. It is not checked for being a string or non-empty.
