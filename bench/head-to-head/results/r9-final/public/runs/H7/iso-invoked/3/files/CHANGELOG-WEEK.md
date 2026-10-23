# Changelog: 14 to 20 October 2026

This changelog lists what changed in the code between 14 and 20 October 2026, so the team knows what shipped and what to test. It is written for the whole team and comes from the git history on `main`, dated 20 October 2026.

This week we added three search features, an invoice PDF download and an orders endpoint. We also fixed three bugs, in search, billing and sign-in. Nothing in the history is marked as a breaking change.

## Search

- **Guest name search:** You can now search bookings by guest name (`e7293a8`, 14 October).
- **Date filter:** You can now filter bookings by date (`17e9fb2`, 16 October).
- **Empty search fix:** An empty search no longer crashes the page (`dff9952`, 15 October).

## Billing

- **Invoice PDF:** You can now download an invoice as a PDF (`438513d`, 17 October).
- **Tax rounding fix:** Tax is now rounded to the cent (`6be51f2`, 18 October). Check invoices created before this fix if exact totals matter to you.
- **Invoice module split:** We split the invoice module into smaller parts (`2353c31`, 20 October). This is an internal refactor, and it changes no behaviour.

## Orders

- **Create orders:** You can now create an order with `POST /orders` (`f555c4d`, 15 October).
- **Initial API:** We added the first version of the orders API (`3140958`, 14 October).

## Authentication

- **Session fix:** Sessions no longer expire while a form is open (`af6cd4b`, 19 October).

## Maintenance

- **API reference:** We updated the API reference (`7683aaa`, 20 October).
- **Dependencies:** We bumped dependencies (`921093e`, 20 October). The commit message does not list which packages changed.

## Scope of this list

- **Included:** Every commit with an author date from 14 to 20 October 2026.
- **Left out:** The CSV export (`0dcafb4`, 10 October) and the occupancy heatmap (`ebe42d6`, 21 October) fall outside the week.
