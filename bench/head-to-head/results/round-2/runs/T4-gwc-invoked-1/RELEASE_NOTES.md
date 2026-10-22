# Release Notes: Version 1.4.1

**Covers changes since v1.4.0** (October 15 – October 22, 2026)

---

## ⚡ Faster Bookings List

- The bookings list now loads 50 bookings per page instead of everything at once. Properties with many reservations will see the page open faster and feel more responsive.

## 🐛 Fixes

- **Day-before reminders no longer go out for cancelled bookings.** Previously a guest who had cancelled could still get a "your stay is tomorrow" reminder. Cancelled bookings are now skipped.

## 🔒 Security

- **Safer CSV exports.** Exported booking files could contain text that Excel or Google Sheets would treat as a formula and run. Exports now neutralize this, so opening a file from your own account, or one containing guest-entered text, is safe.

---

**Summary**

This update makes the bookings page faster for busy properties, stops reminders going to guests who have cancelled, and makes CSV exports safe to open in spreadsheet tools. No action is needed on your part.
