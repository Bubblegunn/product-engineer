# fetchkit v1.3.0 — Release Notes

Changes since v1.2.0.

## Action required: option renamed

The `maxItems` option has been renamed to `limit`. This applies both to the option you pass to `fetchAll` and to the default in the config.

```js
// v1.2.0
fetchAll(client, { maxItems: 50 });

// v1.3.0
fetchAll(client, { limit: 50 });
```

The old name is not accepted as an alias. If you still pass `maxItems`, it is silently ignored and the default limit of 100 applies. Search your code for `maxItems` before upgrading.

## What's new

- **Retry helper.** fetchkit now exports `withRetry(fn, retries)`. It calls `fn` and, if it throws, tries again up to `retries` more times. If every attempt fails, it throws the last error. The default is 2 retries (3 attempts in total), set by the new `retries` config value. `withRetry` is a helper you call yourself. `fetchAll` does not retry automatically.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30. If you rely on the old value, set the timeout explicitly.

## Not in this release

- **CSV export for reports.** It was added and then removed again during this cycle, so it is not available in v1.3.0.
