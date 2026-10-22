# stayhub 1.4.1 release notes

These notes tell hotel owners what changed since version 1.4.0, so you know what to expect when you update.

Version 1.4.1, 21 October 2026. Written for hotel owners who use stayhub. Your developer or support contact can answer technical questions.

## Overview

Version 1.4.1 fixes two mistakes and closes one security risk. It also makes a long bookings list easier to handle.

You do not need to change any settings. One change needs your attention: the bookings list now shows 50 bookings at a time.

## What changed

### Security fix

- **Safer CSV exports:** A guest could type a name that a spreadsheet reads as a formula, for example a name starting with `=`. Opening your export could then run that formula. stayhub now marks such entries as plain text. A cell that starts with `=`, `+`, `-` or `@` now shows a leading apostrophe (`'`) in your spreadsheet.

### Fixes

- **Reminders for cancelled bookings:** stayhub no longer sends the day-before reminder email for a cancelled booking. Before this fix, guests who had cancelled could still get a reminder.
- **Stay totals in whole cents:** The total for a stay is now rounded to two decimal places. Before this fix, a total could show extra digits after the cents.

### Improvement

- **Faster bookings list:** The bookings list now shows 50 bookings per page. Large lists open faster. If you have more than 50 bookings, go to the next page to see the rest.

## Not in this release

Bulk cancel, the button that cancels several bookings at once, is not part of 1.4.1. We removed it before release. Cancel bookings one at a time.
