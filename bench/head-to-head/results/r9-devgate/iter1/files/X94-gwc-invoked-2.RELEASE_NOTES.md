# StayHub 1.5.0 Release Notes

What's new since v1.4.0, for hotel owners.

## New

- **Late checkout requests.** A guest can now ask for late checkout, and the booking records it. The default is until 14:00.

## Fixed

- **No more reminders for cancelled bookings.** Arrival reminders now skip cancelled bookings. Before, guests who had cancelled could still be reminded about their stay.
- **Safer CSV exports.** If a guest name starts with `=`, `+`, `-` or `@`, Excel or Google Sheets could treat it as a formula when you opened the export. Exports now neutralise these names so they show up as plain text.

## Pricing change: please review

- **The nightly rate used for quotes is now €135, up from €120.** For example, a 3-night stay is quoted at €405 instead of €360. If this isn't what you expect, check your pricing before you send out new quotes.

## Setup

- The README now has setup steps. It also says the reminder job reads the bookings file from the path in the `BOOKINGS_FILE` environment variable.

---

*These notes come from the git history between v1.4.0 and main. I didn't run the tests.*
