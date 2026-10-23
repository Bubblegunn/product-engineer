# StayHub release notes — changes since v1.4.0

Version 1.5.0

## What's new

- **Late checkout requests.** Guests can now ask for a late checkout. By default the request is held until 14:00 on the checkout day, and the booking keeps a record of the time requested.

## Fixes

- **Cancelled bookings no longer trigger arrival reminders.** Reminders now go out only for bookings that are still active. Bookings with no status set are still reminded, as before.
- **Safer guest-list exports.** If a guest name starts with `=`, `+`, `-` or `@`, Excel and Google Sheets could treat it as a formula when you open the exported CSV. Those names are now marked as plain text. Normal names are unchanged.

## Pricing

- **The nightly rate is now €135, up from €120.** Quotes use the new rate. A one-night stay quotes €135.

## Behind the scenes

- Added automated checks for one-night stays, plain guest names and bookings with no status, and tidied some internal code. You don't need to do anything.
