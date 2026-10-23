# Release Notes: what's new since v1.4.0

**Analysis basis**

- Generated: `2026-10-23 10:46:59 +03`
- Range: `v1.4.0` → `main` (12 commits)
- Branch: `main`
- Method: read-only git inspection. Tests and builds were not run.

---

## 🚀 New Features

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Search ignores upper and lower case, so "smith", "Smith" and "SMITH" all find the same guest.

## 🔒 Security

- **Safer spreadsheet exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the exported CSV in Excel or Google Sheets. These names are now exported as plain text. This matters if guests enter their own names through an online booking form.

## 🐛 Bug Fixes

- **Guest names with commas export correctly.** A name like "Smith, John" used to split across two columns in the exported CSV and push the check-in date out of place. Names containing commas, quotes or line breaks now stay in a single column.

## 🧪 Behind the Scenes

- We added checks for guest search, for commas in exported names, and for an empty bookings list. We also tidied some internal code and documentation. None of this changes how the product looks or works.

---

**Summary**

This release adds guest-name search, and it makes CSV exports safer and more reliable. If you share or import exported booking files, we recommend updating.
