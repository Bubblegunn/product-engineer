# Release Notes — Version 1.5.0

Changes since v1.4.0.

## What's new

- **Late checkout requests.** Guests can now ask for a late checkout on their booking. By default the request is held until 14:00.

## What's changed

- **New nightly rate: €135 (was €120).** Price quotes now use €135 per night, so quotes for new stays will be higher than before.

## Fixes

- **No more reminders for cancelled bookings.** Arrival reminders were also going out for bookings that had been cancelled. They are now skipped.
- **Safer booking exports.** If a guest's name starts with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel could treat it as a formula when you open the exported CSV. Exports now neutralise these names, so they show up as plain text.
