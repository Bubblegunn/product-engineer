# fetchkit v1.3.0 release notes

Read this to decide how to upgrade from v1.2.0 to v1.3.0. It is written for developers who call fetchkit from their own code. Released 14 August 2026.

## Overview

Version 1.3.0 renames one option, which can break your code without an error. It also adds a retry helper and raises the default timeout from 30 to 45 seconds.

Before you upgrade, search your code for `maxItems` and rename it to `limit`.

## Rename `maxItems` to `limit`

The `maxItems` option is now `limit`. This applies to the option you pass to `fetchAll` and to the default in the configuration.

fetchkit v1.3.0 does not read `maxItems`. If you still pass it, fetchkit ignores it and returns up to 100 items, the default. Your code keeps running, so you may not notice the change.

Change your calls like this:

```js
// v1.2.0
fetchAll(client, { maxItems: 50 });

// v1.3.0
fetchAll(client, { limit: 50 });
```

## Retry failed calls with `withRetry`

fetchkit now exports a helper named `withRetry`. It runs a function again if the function throws an error. If every attempt fails, it throws the last error.

- **Default attempts:** `withRetry` makes one first attempt and up to 2 retries, so 3 attempts in total.
- **Custom count:** Pass the number of retries as the second argument, for example `withRetry(fn, 5)`.
- **Default setting:** The new `retries` configuration value holds the default of 2.
- **Your call to make:** `fetchAll` does not retry by itself. Wrap your call in `withRetry` where you want retries.

```js
const { fetchAll, withRetry } = require('fetchkit');

const items = withRetry(() => fetchAll(client, { limit: 50 }));
```

`withRetry` runs your function once per attempt and does not wait between attempts.

## Longer default timeout

The default timeout is now 45,000 milliseconds (45 seconds). In v1.2.0 it was 30,000 milliseconds (30 seconds).

If your code relies on the shorter default, set the timeout yourself before you upgrade.

## CSV export is not part of this release

Report export to CSV (comma-separated values) is not available in v1.3.0. It was added and then removed again during development. The line "Supports CSV export of reports" in the README is wrong. Do not plan around that feature.
