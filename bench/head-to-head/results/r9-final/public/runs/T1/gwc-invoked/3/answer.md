I committed the staged fix as `42bd1c1`, with the message `fix(reminders): skip cancelled bookings in stay-start reminders`. It touches `src/reminders.js` and `test/reminders.test.js`. I didn't run the tests.

Here is the changelog for the week.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:29:04 +03`
- Range: `2026-10-16` → `2026-10-23` (last 7 days)
- Branch: `main`
- Method: read-only git inspection. There is no `CLAUDE.md`, and I ran no builds or tests.

---

## 🐛 Bug Fixes

- Guests with cancelled bookings no longer get the "your stay starts tomorrow" email. `dueReminders` now skips any booking whose status is `cancelled`. A regression test covers a cancelled and a confirmed booking with the same check-in time.

---

**Summary**

The only change in the last 7 days is the reminder fix above. The earlier history is outside this window:

- **Oct 15:** CSV export of bookings.
- **Oct 14:** the initial reminders, mail text and listing.