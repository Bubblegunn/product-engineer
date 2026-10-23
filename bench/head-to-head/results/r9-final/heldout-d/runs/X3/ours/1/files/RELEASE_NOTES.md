Changes since v1.2.0

Failed requests are now retried automatically, up to 2 more times, so a brief hiccup no longer ends your call with an error.
Requests now wait up to 45 seconds before giving up (it was 30), so slower responses have time to finish instead of timing out.
The setting that caps how many items come back has been renamed. If you set it yourself, update it to the new name: the old name is now ignored, and you will get the default of 100 items instead of your cap.

Not in this release:
- CSV export for reports: it was added and then withdrawn within this range, so it is not available.
