# fetchkit v1.3.0

This release adds automatic retries and raises the default timeout. It also renames one option, which may need a change in your code.

## Action required: `maxItems` is now `limit`

The `maxItems` option of `fetchAll` is now called `limit`. The old name is no longer read. If you still pass `maxItems`, it is ignored and `fetchAll` returns up to 100 items, the default.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

If you set `maxItems` in your own copy of the config, rename it to `limit` there too.

## What's new

- **Automatic retries.** A new `withRetry` helper runs a function again if it throws. By default it retries up to 2 times, so the function runs at most 3 times. If every attempt fails, it throws the last error. You can pass a different retry count as the second argument.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you set `timeoutMs` yourself, nothing changes for you.

## Not included

CSV export for reports is not part of this release. The README for this version still says it is supported. That line is wrong.
