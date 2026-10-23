Changes since v1.4.0 (commit 9a24d64 to 6b07271)

You can now see your occupancy, the share of your available room-nights that are booked, as a whole number out of 100, so you can tell at a glance how full the hotel was. A period with no available nights shows 0.

Not in this release:
- Reminders at 9am hotel time: the reminder timing can now use your hotel's local time, but nothing yet passes it your time zone, so reminders still go out at 9am UTC (the world standard time) for now.
- Export changes: the export now remembers its last results, but we did not measure any difference, so we make no claim about it.
- Odd guest names: nothing changed in how names are shown; the only addition is a diagnostic message for our own troubleshooting.
