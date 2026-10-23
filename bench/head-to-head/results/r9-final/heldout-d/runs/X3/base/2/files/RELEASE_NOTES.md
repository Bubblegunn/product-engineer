# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option has been renamed to `limit`. This applies to the option you pass to `fetchAll` and to the default in the config. The old name is **not** accepted as an alias. If you still pass `maxItems`, it is silently ignored and the default limit of 100 applies.

```js
// before
fetchAll(client, { maxItems: 50 });

// now
fetchAll(client, { limit: 50 });
```

## What's new

- **Retries.** fetchkit now exports a `withRetry(fn, retries)` helper. It calls your function again if it throws, and rethrows the last error once the retries run out. `retries` defaults to 2, so a function runs up to 3 times in total. The default is set by the new `retries` config value.

## What's changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set your timeout explicitly.

## Notes

- CSV export for reports is **not** part of this release. It was added and then removed again before v1.3.0 was tagged.
