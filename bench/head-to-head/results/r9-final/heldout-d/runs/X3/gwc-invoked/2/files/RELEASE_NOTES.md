# fetchkit v1.3.0 Release Notes

This release covers changes since v1.2.0.

## Action required: option renamed

The `maxItems` option has been renamed to `limit`. This applies both to the option you pass to `fetchAll` and to the default in the config.

```js
// Before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// Now (v1.3.0)
fetchAll(client, { limit: 50 });
```

The old name is not accepted as an alias. If you still pass `maxItems`, it is silently ignored and the default limit of 100 applies. Search your code for `maxItems` before upgrading.

## What's new

- **Retry helper.** fetchkit now exports `withRetry(fn, retries)`. It calls your function and, if it throws, tries again. It makes up to `retries` extra attempts, then throws the last error. The default is 2 retries, set by the new `retries` config value. Retries run immediately, with no delay between them. `fetchAll` does not retry on its own, so wrap the calls you want retried.

## What changed

- **Longer default timeout.** The default request timeout went from 30 seconds to 45 seconds. If you relied on the old value, set your timeout explicitly.

## Not included

- **CSV export for reports** was added and then removed again during this cycle. It is not part of v1.3.0, and nothing about it changed for you compared with v1.2.0. The README for this release still says CSV export is supported. That line is out of date and will be corrected.
