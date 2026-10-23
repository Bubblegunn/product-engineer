# stayhub Release Notes

**Changes since v1.4.0 (now version 1.4.1)**, 16–22 October 2026

---

## 🔒 Security

- **Safer CSV exports.** If a guest name or other field starts with `=`, `+`, `-` or `@`, Excel and Google Sheets could treat it as a formula and run it when you open the export. Exports now neutralize these entries, so opening a file is safe. Those cells show a leading apostrophe.

## 🐛 Bug Fixes

- **No more reminders for cancelled bookings.** The day-before arrival email is no longer sent to guests whose booking was cancelled.
- **Cleaner stay totals.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, which avoids odd amounts like `149.99000000000001`.

## ⚡ Performance

- **Faster bookings list.** The list now loads 50 bookings per page instead of everything at once, so it stays quick as your booking history grows.

---

**Summary**

This release focuses on safety and accuracy: safer exports, correct reminders, and tidier pricing, plus a faster bookings list.
