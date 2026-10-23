# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option of `fetchAll` is now called `limit`. The old name is no longer read, so passing `maxItems` is silently ignored and you will get the default of 100 items.

```js
// before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// after (v1.3.0)
fetchAll(client, { limit: 50 });
```

If you override defaults through the config module, the same rename applies (`maxItems` is now `limit`).

## What's new

- **Retries.** A new `withRetry(fn, retries)` helper re-runs a function if it throws, and rethrows the last error once all attempts are used. `retries` defaults to 2, so a call is tried up to 3 times in total.

## What changed

- **Longer default timeout.** The default timeout went from 30 seconds to 45 seconds. If you rely on the old value, set it explicitly.

## Notes

- CSV export for reports is **not** part of this release. It was added and then removed again during development. The README says CSV export is supported; that line is incorrect.
