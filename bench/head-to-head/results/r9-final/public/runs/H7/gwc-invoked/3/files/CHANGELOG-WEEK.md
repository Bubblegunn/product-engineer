# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 14:45:02 +03`
- Range: `2026-10-14` → `2026-10-20` (UTC commit timestamps)
- Branch: `main`
- Method: read-only git inspection (no builds or tests were run)

---

## 🔎 Search

- Bookings can now be searched by guest name.
- Bookings can now be filtered by date.
- Fixed a crash when submitting an empty search.

## 💳 Billing

- Invoices can be downloaded as PDF.
- Tax is now rounded to the cent.
- The invoice module was split up (internal refactor, no behavior change intended).

## 🔐 Auth

- Sessions no longer expire while a form is open, so users don't lose in-progress input.

## 🗂️ Dependencies & Docs

- Version bumped from 0.1.0 to 0.1.1 in `package.json`.
- API reference (`docs/API.md`) updated.

---

**Summary**

Most of the week went into search (name lookup, date filter, empty-search crash fix) and billing (PDF invoices, tax rounding, module split). There was also one auth fix for session expiry. The occupancy heatmap (reports) landed on 2026-10-21, after this window, so it belongs in next week's notes.
