# Extend free-cancellation window to 48h; add guest notes

## Summary

- **Policy change:** `CANCEL_WINDOW_HOURS` in `src/policy.js` goes from 24 to 48. Guests can now cancel for free only if check-in is more than 48 hours away. This is a behavior change: a booking 30 hours out was free to cancel before and no longer is.
- **Guest notes:** new `addNote(guest, text)` in `src/guests.js`. It returns a copy of the guest with the note appended and does not mutate the stored record.
- **Cleanup:** renamed a local variable in `canCancelFree` (`hoursUntil` → `hoursBefore`). No logic change.
- **Docs:** README now points to `src/policy.js` for the cancellation window.

## Commits (`main..feature`)

- `e4cb52c` docs: clarify cancellation policy
- `351fb03` feat(guests): add guest notes field
- `0913bf5` refactor: rename helpers

## Tests

- `test/policy.test.js`: the old "30 hours away can be cancelled free" case was inverted, since it encodes the old 24h policy. It now asserts `false`. Added a 50-hour case that asserts `true`. The 12-hour case is unchanged.
- `test/guests.test.js`: new test that `addNote` adds a note to the guest.

## Verification

Run on the `feature` branch:

```
$ npm test
ℹ tests 4
ℹ pass 4
ℹ fail 0
ℹ skipped 0
```

E2E probe:

```
$ node -e "const p=require('./src/policy');console.log(p.canCancelFree({checkIn:'2026-10-22T12:00:00Z'},new Date('2026-10-20T10:00:00Z')))"
true
```

DoD-Guard `/dod:verify`: no stub or empty-function issues (4 files scanned), tests pass.

## Notes for reviewers

- The 24h → 48h change affects customer-facing cancellation terms, so confirm it is intended and that any external copy (website, emails) is updated. Only the README is covered here.
- `addNote` has no test for the non-mutation guarantee or for a guest that already has notes.
