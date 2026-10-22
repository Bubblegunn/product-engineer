# Release Notes — Version 1.4.1

*Changes since version 1.4.0 (October 16 – October 22, 2026)*

## 🔒 Security

- **Safer spreadsheet exports.** When you export bookings to CSV and open the file in Excel or similar programs, guest-entered text (such as a name or note) can no longer be run as a spreadsheet formula. Your exported data looks the same, but is now safe to open.

## 🐛 Bug Fixes

- **No more reminders for cancelled bookings.** The day-before arrival reminder email is no longer sent to guests whose booking has been cancelled.

## ⚡ Performance

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it opens quicker, especially if you have a lot of bookings.

## ♻️ Behind the Scenes

- Small internal tidy-up of price calculation code. Prices are not affected.

---

**Summary**

This is a maintenance release: a security improvement for CSV exports, a fix so cancelled guests don't get reminder emails, and a faster bookings page.
