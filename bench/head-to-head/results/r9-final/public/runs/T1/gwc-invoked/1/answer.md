Committed the fix as `14210bc`: `fix(reminders): skip cancelled bookings in stay-starts-tomorrow email`. It covers `src/reminders.js` and `test/reminders.test.js`. I didn't run the tests.

Here is the changelog from the skill. It uses read-only git inspection, and there is no `CLAUDE.md` in the repo.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23`
- Range: `2026-10-16` → `2026-10-23` (last 7 days)
- Branch: `main`
- Method: read-only git inspection

---

## 🐛 Bug Fixes

- Guests with cancelled bookings no longer get the "your stay starts tomorrow" email. `dueReminders` now skips any booking with status `cancelled`. A regression test covers a cancelled booking and a confirmed one with the same check-in time.

---

**Summary**

This week's only change was the cancelled-booking reminder fix. The CSV export of bookings (`bd97d27`, 2026-10-15) and the initial reminders, mail text and listing (`989c21f`, 2026-10-14) fall before the window, so I left them out. Tests were not run.