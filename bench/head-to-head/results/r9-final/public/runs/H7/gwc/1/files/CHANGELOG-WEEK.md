# Weekly Changelog: 14–20 October 2026

**Analysis basis**

- Generated: `2026-10-23 14:44:32 +03`
- Range: `2026-10-14` → `2026-10-20` (commit timestamps in UTC)
- Branch: `main`
- Method: read-only git inspection (no builds or tests were run)

---

## 🔎 Search

- Bookings can now be searched by guest name.
- Bookings can now be filtered by date.
- Fixed a crash on the page when submitting an empty search.

## 🧾 Billing

- Invoices can be downloaded as PDF.
- Tax is now rounded to the cent.
- The invoice module was split up (internal refactor, no behaviour change intended).

## 🔐 Auth

- Sessions no longer expire while a form is open, so in-progress work is no longer lost.

## 📚 Documentation & Dependencies

- API reference updated.
- Dependencies bumped.

---

**Summary**

The week centred on search (guest name and date filtering, plus an empty-search crash fix) and billing (PDF invoices, tax rounding, module cleanup). It also included an auth session-expiry fix. The occupancy heatmap (`ebe42d6`) landed after 20 October, so it is not included here.
