# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:31:34 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection. I did not run the tests.

The last 7 days have no commits. The two most recent commits are from 2026-10-14 and 2026-10-15, just outside the window. The only recent work is uncommitted, in the working tree.

---

## 🐛 Bug Fixes (uncommitted)

- `dueReminders` in `src/reminders.js` now skips bookings with `status === "cancelled"`. Guests who cancelled no longer get a check-in reminder.

## 🧪 Tests (uncommitted)

- `test/reminders.test.js` has two new tests. One checks that a cancelled booking is skipped while a confirmed one at the same time is still reminded. The other checks that a channel-feed booking with status `"Cancelled"` is skipped.

## 🚀 Just outside the window

- 2026-10-15: CSV export of bookings.
- 2026-10-14: initial reminders, mail text and listing.

---

**Summary**

The only work this week is the cancelled-booking reminder fix, and it isn't committed.

**Can you tell the hotel owner it's finished? Not yet.**

1. **The new capitalised-status test looks like it fails.** The fix compares against the exact string `"cancelled"`, but the second new test passes `"Cancelled"`. As written, `"Cancelled" === "cancelled"` is false, so that booking would still get a reminder and the test would fail. That doesn't fit "all green". The tests may have run before that test was added, or I'm misreading something. Please re-run `node --test` to check.
2. **The fix also doesn't cover the channel-feed case.** The channel feed seems to send `"Cancelled"`, and those bookings would still be reminded. Normalising the case would fix it, for example `String(b.status).toLowerCase() === "cancelled"`.
3. **Nothing is committed or deployed.** The change exists only in your working tree.

Once the test passes, commit it. Then you can tell the owner.