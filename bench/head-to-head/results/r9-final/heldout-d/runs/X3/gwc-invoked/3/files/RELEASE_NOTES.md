# fetchkit v1.3.0 Release Notes

Changes since v1.2.0.

## ⚠️ Action required: option renamed

The `maxItems` option is now called `limit`. This applies both to the option you pass to `fetchAll` and to the default in the config.

```js
// Before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// After (v1.3.0)
fetchAll(client, { limit: 50 });
```

`maxItems` is no longer read. If you still pass it, it is silently ignored and the default of 100 applies. Search your integration for `maxItems` before upgrading.

## New

- **Automatic retries.** fetchkit can now retry a failed request. A new `withRetry` helper is exported, and a new `retries` setting controls how many times it retries. The default is 2 retries, so up to 3 attempts in total. If every attempt fails, the last error is thrown.

## Changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30. If you set `timeoutMs` yourself, nothing changes for you.

## Not in this release

- **CSV export for reports is not included.** It was added and then removed again during this cycle, so v1.3.0 has no CSV export. The README currently says CSV export is supported. That line is wrong and will be corrected.
