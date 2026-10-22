# Release Notes — Version 1.4.1

Changes since version 1.4.0 (October 16–22, 2026).

## 🔒 Security

- **Safer spreadsheet exports.** When you export your bookings to CSV and open the file in Excel or Google Sheets, guest-entered text (such as a name or a note) can no longer be run as a spreadsheet formula. Your exports open exactly as they look.

## 🐛 Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't get a confusing message.

## ⚡ Performance

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once. The page opens faster, especially if you have a lot of bookings.

---

*Note: a bulk cancel button for the bookings page was tried during this period and removed before release, so it is not part of 1.4.1.*
