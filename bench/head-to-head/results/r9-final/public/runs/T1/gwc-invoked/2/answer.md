I committed the staged fix as `27cf94b`: `fix(reminders): skip cancelled bookings in stay-starts-tomorrow email`. I didn't run the tests.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:28:59 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection, plus the one commit you asked for. No tests or builds were run.

---

## 🐛 Bug Fixes

- Guests with cancelled bookings no longer get the "your stay starts tomorrow" email. `dueReminders` in `src/reminders.js` now skips any booking with status `cancelled`.

## 🧪 Tests & CI

- Added a regression test in `test/reminders.test.js`. With one cancelled and one confirmed booking on the same day, only the confirmed one is reminded.

---

**Summary**

This week's only change was the cancelled-booking reminder fix, which is now committed with a test. The earlier commits (CSV export of bookings, the initial reminders, mail text and listing) are older than 7 days, so they aren't in this range.