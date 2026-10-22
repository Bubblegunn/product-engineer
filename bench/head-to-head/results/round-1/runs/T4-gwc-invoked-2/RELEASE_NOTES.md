# Release Notes: since v1.4.0

Version 1.4.1 and the updates that followed.

## 🔒 Security

- **Safer CSV exports.** Exported booking files can no longer run formulas when you open them in a spreadsheet app such as Excel or Google Sheets. Guest-entered text that looks like a formula is now treated as plain text.

## 🐛 Bug Fixes

- **No more reminders for cancelled bookings.** The day-before reminder now skips bookings that have been cancelled, so guests who cancelled won't get a reminder.

## ⚡ Performance

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once. It opens faster, especially if you have a lot of bookings.

## Note

- A bulk cancel button was tried during this period and then removed before release. It is not part of this version.
