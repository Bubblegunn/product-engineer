# StayHub Release Notes

**Version 1.4.1** (changes since 1.4.0)

---

## 🐛 Fixes

- **No more reminders for cancelled bookings.** Guests who cancelled were still getting the "see you tomorrow" email the day before their arrival date. Cancelled bookings are now skipped.
- **Stay totals are rounded to the cent.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, so you won't see long trailing decimals.

## ⚡ Performance

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, which keeps the page quick as your booking history grows.

## 🔒 Security

- **Safer CSV exports.** If a guest name or other field starts with `=`, `+`, `-` or `@`, spreadsheet apps like Excel could treat it as a formula and run it when you open the export. Those values are now marked as plain text, so exported files are safe to open.

---

**Summary**

This is a reliability and safety update: guests no longer get reminders for stays they cancelled, exports are safe to open in a spreadsheet, and the bookings list stays fast as it grows.
