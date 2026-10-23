# fetchkit v1.3.0

## Breaking change

- **The `maxItems` option is now `limit`.** Pass `limit` to `fetchAll` to cap the number of results. `maxItems` is no longer read, so code that still passes it will silently get the default cap of 100 items. The default value is unchanged.

  ```js
  // before
  fetchAll(client, { maxItems: 50 });
  // now
  fetchAll(client, { limit: 50 });
  ```

  If you read the defaults from the config module, `maxItems` there is now `limit` too.

## What's new

- **Retry helper.** `withRetry(fn, retries)` is now exported. It calls `fn` and, if it throws, tries again up to `retries` more times. If every attempt fails, it throws the last error. The default is 2 retries (up to 3 attempts in total).

## Changes

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30.

## Not included

- CSV export for reports was tried during this cycle and taken back out. It is not part of v1.3.0.
