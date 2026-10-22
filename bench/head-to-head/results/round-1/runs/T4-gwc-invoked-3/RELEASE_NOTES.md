# Release Notes: Version 1.4.1

Changes since v1.4.0.

## ⚡ Faster Bookings List

- The bookings list now shows 50 bookings per page instead of loading everything at once, so the page stays quick even with a long booking history.

## 🐛 Fixes

- **Day-before reminders:** Guests who cancelled their booking no longer get a "your stay is tomorrow" reminder.

## 🔒 Security

- **Safer CSV exports:** Exported files are now protected against spreadsheet formula injection. If a booking field contains text that looks like a formula, Excel or Google Sheets will treat it as plain text and won't run it.

## Behind the scenes

- Internal clean-up of the pricing calculation. Prices are unchanged.
