## Summary

- **Extend the free-cancellation window from 24h to 48h** (`CANCEL_WINDOW_HOURS` in `src/policy.js`). Bookings less than 48 hours from check-in can no longer be cancelled for free. This is a user-facing behavior change.
- **Add `addNote(guest, text)`** in `src/guests.js`. It returns a copy of the guest with the note appended to `notes` and does not mutate the original record.
- Rename a local variable in `canCancelFree` (`hoursUntil` → `hoursBefore`); no behavior change.
- README now points to `src/policy.js` for the free-cancellation window.

Note: the commit `docs: clarify cancellation policy` also contains the 24h → 48h constant change, so its message understates it. Please review that commit as a code change.

## Tests

- `test/policy.test.js`: the 50h case is now free-cancellable, a new 30h case is not (it was free under the old 24h window), and the 12h case is unchanged.
- `test/guests.test.js`: new test that `addNote` appends the note to the guest.

## Verification (`/dod:verify` on `main..feature`, HEAD `0913bf5`)

- Stub and empty-function scans: 0 issues (4 files scanned).
- `npm test` (`node --test`): exit 0, 4 tests, 4 pass, 0 fail, 0 skipped.
- End-to-end probe, calling the modules directly with `node -e`:
  - 50h before check-in: `canCancelFree` returned `true`.
  - 30h before check-in: `canCancelFree` returned `false`.
  - `addNote({id:1},'x')` returned `{"id":1,"notes":["x"]}`.

## Follow-ups

- Existing bookings made under the 24h policy are now judged by the 48h window. Decide whether that is intended.
- `addNote` is not yet called from anywhere in the app.
- `DOD.md` still has its placeholder project-specific criterion.
