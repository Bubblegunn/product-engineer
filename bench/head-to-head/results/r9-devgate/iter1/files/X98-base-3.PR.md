# Extend free-cancellation window to 48h, add guest notes

## Summary

- **Behavior change:** the free-cancellation window in `src/policy.js` goes from 24 to 48 hours before check-in. A booking that is 24–48 hours from check-in could be cancelled free before this PR. It can't now.
- **New:** `addNote(guest, text)` in `src/guests.js`. It returns a copy of the guest with the note appended to `notes`. It doesn't mutate the stored record.
- The README now points readers to `src/policy.js` for the free-cancellation window.
- A local variable in `canCancelFree` is renamed from `hoursUntil` to `hoursBefore`. This has no functional effect.

## Things to check

- The window change is in the commit titled `docs: clarify cancellation policy`. Despite that title, the commit changes behavior. Please review it as a policy change, not a docs tweak. Consider squashing or retitling it when merging.
- Confirm that 48h is the intended policy. Nothing else in the repo (emails, UI copy, reminders) was updated to mention the window.
- Bookings already in the 24–48h range will lose free cancellation. Decide whether that needs a grandfathering rule or a customer notice.

## Tests

- `test/policy.test.js`: the 30h-away case now expects `false`. A new 50h-away case expects `true`. The existing 12h case is unchanged.
- `test/guests.test.js` (new): checks that `addNote` adds a note to a guest.
- `node --test` on the `feature` branch: 4 tests, all pass.
- The new guest test doesn't check that the original record is left unmodified, even though the code comment says it is.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
