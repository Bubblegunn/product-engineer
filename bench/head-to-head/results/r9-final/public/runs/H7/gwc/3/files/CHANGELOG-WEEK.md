# Weekly Changelog: 14–20 October 2026

**Analysis basis**

- Generated: 2026-10-23
- Range: `2026-10-14` → `2026-10-20` (inclusive, UTC; all commit timestamps are UTC)
- Branch: `main`
- Method: read-only git inspection (no builds or tests were run)

---

## 🔎 Booking Search

- **Search by guest name**: bookings can now be searched by the guest's name.
- **Filter by date**: search results can be narrowed to a date.
- **Fix**: an empty search no longer crashes the page.

## 🧾 Billing & Invoices

- **Invoice PDF download**: an invoice can now be downloaded as a PDF.
- **Fix**: tax is now rounded to the cent.
- **Refactor**: the invoice module was split up (internal, no behaviour change intended).

## 🔐 Authentication

- **Fix**: sessions no longer expire while a user has a form open, so in-progress input isn't lost.

## 📚 Documentation & Tooling

- The API reference (`docs/API.md`) was updated.
- The "bump dependencies" commit only changed the `package.json` version from 0.1.0 to 0.1.1. No dependency entries changed.

---

**Summary**

This week centred on booking search (name search and date filter, plus a crash fix) and billing (PDF invoices and tax rounding). There was also one auth fix for session expiry.

*Not included:* the occupancy heatmap (`feat(reports)`) was committed on 2026-10-21, after this window, so it belongs in next week's changelog.
