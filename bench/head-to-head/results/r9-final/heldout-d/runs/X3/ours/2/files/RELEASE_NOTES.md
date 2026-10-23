Changes since v1.2.0

Requests that fail are now tried again automatically, up to 2 more times (3 attempts in total), so a brief network hiccup no longer makes your integration fail on the first error.
Slow requests now get 45 seconds before giving up instead of 30, so large responses are less likely to be cut off.
Action needed: the setting that caps how many items come back has been renamed. The old name is no longer read, so a call that still uses it silently falls back to the default cap of 100 items. Rename it in your integration; the new name is "limit".

Not in this release:
- CSV export for reports: it was added and then withdrawn within this range, so it is not available.
