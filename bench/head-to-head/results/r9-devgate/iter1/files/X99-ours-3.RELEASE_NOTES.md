Changes since v1.4.0 (commit 6b07271 back to 7d5bb4d, the last 10 commits)

You can now see your occupancy, the share of your available room-nights that are booked, as a whole percentage, so you can tell at a glance how full your hotel was. A period with no available nights shows zero.
Guest reminders can now go out at 9am in your hotel's local time, the day before check-in, instead of 9am in universal time (UTC), so guests in your time zone no longer get them at an odd hour.
Exporting the same bookings a second time reuses the file already built instead of building it again, so repeated exports of an unchanged list do less work.

Not in this release:
- Export speed claims: no timing was measured, so nothing is said about how long exports take.
- Reminder time zone setting: the reminder code accepts your hotel's time zone, but nothing in this range passes it in yet, so reminders still go out at 9am UTC until that is connected.
- Occupancy report screen: only the calculation is included; nothing in this range shows it to you yet.
