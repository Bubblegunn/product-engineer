# Weekly Changelog: 14–20 October 2026

**Analysis basis**

- Generated: `2026-10-23 14:44 +03`
- Range: `2026-10-14` → `2026-10-20` (commit timestamps in UTC)
- Branch: `main`
- Method: read-only git history inspection (no builds or tests were run)

---

## 🔎 Search

- Bookings can now be searched by guest name.
- Bookings can be filtered by date.
- Fixed a crash: an empty search no longer breaks the page.

## 💳 Billing

- Invoices can be downloaded as PDF.
- Tax is now rounded to the cent, which fixes fractional-cent amounts.
- The invoice module was split up internally (refactor, no behavior change intended).

## 🔐 Auth

- Sessions no longer expire while a form is open, so users don't lose in-progress input.

## 📚 Documentation & Dependencies

- The API reference was updated.
- Dependencies were bumped.

---

**Summary**

Work this week centered on booking search (new name search and date filter, plus a crash fix) and billing (PDF invoices, tax rounding, module cleanup). It also included an auth session fix, a docs refresh, and a dependency bump. The occupancy heatmap (`ebe42d6`) landed after 20 October, so it isn't included.
