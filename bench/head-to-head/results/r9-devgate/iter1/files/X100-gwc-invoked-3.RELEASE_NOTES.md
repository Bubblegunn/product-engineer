# StayHub Release Notes

**Changes since v1.4.0 (up to version 1.6.0)** — updated 2026-10-23

## What's new

- **Export your bookings as JSON.** Alongside the existing CSV export, you can now download bookings as JSON. Each entry includes the booking ID, guest name and check-in date, which makes it easier to use your data in other tools.

## Fixes

- **Stay totals are now rounded to the cent.** Totals for a stay (nights × nightly rate) are rounded to 2 decimals, so you no longer risk seeing amounts with stray fractions of a cent on rates like 0.10.

## Under the hood

- The CSV library used for exports was updated to a newer version.
- The minimum supported Node.js version is now 20 (previously 18). If you host StayHub yourself, upgrade Node.js before installing this release.
- Internal improvements: added tests for pricing (including zero-night stays) and JSON export, tidied the export code, and fixed a typo in the README. None of these change how the product behaves.

---

*These notes were compiled from the git history between v1.4.0 and `main`. Tests were not run while preparing them.*
