Changes since v1.2.0

You now have a retry helper for failed requests, so a brief hiccup no longer has to become an error in your app. By default it tries again up to 2 times after the first failure (3 attempts in total) and reports the last error if all of them fail. It is a helper you call yourself; existing requests are not retried automatically.
Requests now wait up to 45 seconds before giving up, instead of 30, so slow responses are less likely to be cut off.
The option that caps how many items come back has been renamed to "limit". Action needed: if your code sets this cap under its old name, change it to "limit". The old name is no longer read and is silently ignored, so the default of 100 items applies instead.

Not in this release:
- CSV export for reports: it was added and then withdrawn within this range, so it is not available.
