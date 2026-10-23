# Release Notes: Version 1.5.0

## What's new

- **Late checkout requests.** A guest can now ask for a late checkout on their booking. By default the request is for 14:00, and the booking records the time requested.

## Changes to pricing

- **The nightly rate is now €135, up from €120.** Quotes for new stays use the new rate. A one-night stay now quotes €135.

## Fixes

- **Reminders are no longer sent for cancelled bookings.** Previously a guest who had cancelled could still get a check-in reminder the day before their stay.
- **Safer CSV exports.** If a guest's name starts with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel or Google Sheets could treat it as a formula. Exports now mark these names as plain text, so opening an export is safe. These names appear with a leading apostrophe in the exported file.
