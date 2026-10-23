# StayHub Release Notes

Changes since v1.4.0

## New

- **Occupancy report.** See how full your property is: the report shows booked nights as a percentage of the nights you had available. If you had no available nights in a period, it shows 0% rather than an error.

## Fixed

- **Reminders now go out at 9am your time.** Guest reminders were sent at 9am UTC, which could land at an awkward hour for your property. They are now sent at 9am in your hotel's local time on the day before check-in.

## Improved

- **Faster repeat CSV exports.** Exporting the same set of bookings again now reuses the earlier result instead of rebuilding it, so repeat exports are quicker. The first export of a new or changed set of bookings takes the same time as before.
