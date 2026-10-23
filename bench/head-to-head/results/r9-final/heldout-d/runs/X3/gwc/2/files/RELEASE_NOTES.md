# fetchkit v1.3.0

## Action required: `maxItems` is now `limit`

The `maxItems` option has been renamed to `limit`. The default is unchanged (100).

```js
// Before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// Now (v1.3.0)
fetchAll(client, { limit: 50 });
```

The old `maxItems` name is no longer read. If you still pass it, it is silently ignored and the default of 100 applies. Search your code for `maxItems` before upgrading.

## What's new

- **Retry helper.** fetchkit now exports `withRetry(fn, retries)`. It calls `fn`, and if `fn` throws, calls it again, up to `retries` extra times. If every attempt fails, it throws the last error. The default is 2 retries (3 attempts in total).
  - `fetchAll` does not retry on its own. To get retries, wrap your call: `withRetry(() => fetchAll(client))`.

## Changes

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30. If you set `timeoutMs` yourself, nothing changes for you.

## Not included

CSV export for reports was added and then removed during this cycle. It is not in v1.3.0, even though the README currently says it is.
