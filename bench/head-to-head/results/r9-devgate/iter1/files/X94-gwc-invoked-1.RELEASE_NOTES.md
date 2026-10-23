# Release Notes: v1.5.0

Changes since v1.4.0, for hotel owners.

## New

- **Late checkout requests.** A guest's booking can now carry a late checkout request. By default the request is held until 14:00.

## Pricing change

- **The nightly rate is now €135, up from €120.** Quotes are calculated from this rate, so a stay quoted at €120 per night before this release will now be quoted at €135 per night. Please check that this is the rate you want guests to see.

## Fixes

- **Cancelled bookings no longer get reminders.** Guests who cancelled were still being sent an upcoming-stay reminder. Reminders now skip cancelled bookings.

## Security

- **Safer CSV exports.** If a guest name begins with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel could treat it as a formula when you open the exported bookings file. Exports now prefix those names with an apostrophe so they appear as plain text. A guest whose name starts with one of those characters will see the leading apostrophe in the exported file.

## Other

- Added setup instructions to the README.
- Behind the scenes, we added more automated test coverage for pricing, reminders and exports, and made small code tidy-ups. These don't change how the product behaves.
