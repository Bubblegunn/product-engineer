# StayHub Release Notes

**What's new since v1.4.0 (now at v1.6.0)**

- Generated: `2026-10-23 10:48:12 +03`
- Range: `v1.4.0` → `main` (2026-10-15 → 2026-10-23)
- Method: read-only git inspection; tests were not run

---

## 🚀 New Features

- **Export your bookings as JSON.** In addition to CSV, you can now export bookings as JSON. Each entry includes the booking ID, guest name and check-in date, so the file is easy to use with other tools or to keep as a backup.

## 🐛 Bug Fixes

- **Accurate stay totals.** Totals for a stay are now rounded to 2 decimals, so you no longer see stray fractions of a cent on quotes (for example, 3 nights at 0.10 now totals 0.30 instead of a long decimal).

## 🔧 Under the Hood

- The CSV export library was updated to its latest version for better reliability.
- A zero-night stay is now covered by automated checks, and the export code was tidied up. Neither changes how the product behaves.

---

**Summary**

This release adds JSON export alongside CSV and fixes how stay totals are rounded, so the amounts you quote and the data you export are cleaner and easier to use.
