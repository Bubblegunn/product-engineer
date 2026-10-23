# StayHub Release Notes

**What's new since v1.4.0** (up to version 1.6.0)

---

## 🚀 New

- **Export your bookings as JSON.** Alongside the existing CSV export, you can now export bookings as JSON. Each entry includes the booking ID, guest name and check-in date. This makes it easier to use your booking data in other tools.

## 🐛 Fixed

- **Stay totals are now rounded to 2 decimals.** Totals are calculated as nights × nightly rate and are now rounded to the cent. This prevents odd values such as `0.30000000000000004` from appearing in totals.

## 🔧 Under the hood

- **Updated CSV export library** (csv-lib 1.2.0 → 1.3.0). This keeps CSV exports on a current version.
- **Newer Node.js required: version 20 or later** (previously 18). This only affects you if your team runs StayHub on its own server. Please upgrade Node.js before updating.

---

**Summary**

This release adds JSON export and makes stay totals accurate to the cent. Other changes were internal: a dependency update, a few extra checks for zero-night stays and the JSON export, and documentation and code-style cleanups.
