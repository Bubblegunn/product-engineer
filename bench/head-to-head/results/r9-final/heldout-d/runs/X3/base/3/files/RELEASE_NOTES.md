# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option is now `limit`. This applies to both the per-call option and the default in the config.

```js
// v1.2.0
fetchAll(client, { maxItems: 50 });

// v1.3.0
fetchAll(client, { limit: 50 });
```

`maxItems` is no longer read. If you still pass it, it is silently ignored and the default limit of 100 applies. Search your code for `maxItems` before upgrading.

## What's new

- **Retries.** fetchkit now exports `withRetry(fn, retries)`. It calls `fn` again if it throws, and rethrows the last error once all attempts are used. `retries` defaults to 2, so `fn` runs at most 3 times. Retries run back to back with no delay between them. `withRetry` is not applied to `fetchAll` automatically, so wrap your calls with it where you want this behavior.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set the timeout explicitly.

## Notes

- CSV export of reports is not part of this release. The README says fetchkit supports it, but that line is out of date.
