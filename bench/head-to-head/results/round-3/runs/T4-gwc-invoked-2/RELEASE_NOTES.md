# Release Notes: Version 1.4.1

Changes since version 1.4.0.

## 🔒 Security

- **Safer CSV exports.** Exported booking data can no longer run as a formula when you open it in Excel, Google Sheets or similar spreadsheet programs. Guest-entered text that looks like a formula is now made safe.

## 🐛 Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests who cancelled won't get a confusing message.

## ⚡ Performance

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once. It opens faster, especially if you have a lot of bookings.

## Other

- Behind-the-scenes cleanup of how prices are rounded. Prices should look the same as before.
