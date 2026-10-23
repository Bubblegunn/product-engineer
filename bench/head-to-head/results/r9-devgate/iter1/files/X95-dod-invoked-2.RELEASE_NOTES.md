# StayHub 1.5.0 — Release Notes

## What's new for you

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once. In our test with 10,000 bookings, the list loaded in about 38 ms, down from about 412 ms.
- **No more reminders for cancelled bookings.** Guests whose booking you cancelled will no longer get a check-in reminder email.
- **Slightly leaner CSV export.** We streamlined how the export file is built. The file's contents and columns (id, guest, check-in) are unchanged.

## Good to know

- Reminders are sent by email the day before check-in. This is now described in the README.
