# fetchkit v1.3.0

## Breaking change

- **The `maxItems` option is now `limit`.** If you pass `maxItems` to `fetchAll`, rename it to `limit`. The old name is no longer read, so it is silently ignored and you get the default of 100 items. The same rename applies to the default in the config.

  ```js
  // before
  fetchAll(client, { maxItems: 50 });
  // after
  fetchAll(client, { limit: 50 });
  ```

## New

- **Retry helper.** A new `withRetry(fn, retries)` function is exported. It calls `fn` and, if it throws, tries again. It stops after the first success. If every attempt fails, it throws the last error. `retries` defaults to the new `retries` config value (2), so the function runs up to 3 times in total.
  - `withRetry` is a helper you call yourself. `fetchAll` does not retry automatically.
  - It retries immediately, with no delay between attempts. It retries on any thrown error and works with synchronous functions only.

## Changed

- **Default timeout raised from 30 seconds to 45 seconds** (`timeoutMs: 45000`). If you rely on the old default, set the timeout explicitly.

## Notes

- CSV export for reports was added and then removed again during this cycle. It is **not** part of v1.3.0, and nothing changes for you compared with v1.2.0.
