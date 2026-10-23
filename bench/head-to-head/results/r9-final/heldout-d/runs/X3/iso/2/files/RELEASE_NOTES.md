# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option is now `limit`. This applies to both the `fetchAll` option and the default in the config file. The old name is no longer read. If you still pass `maxItems`, it is silently ignored and the default limit of 100 applies.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

## What's new

- **Retries.** A new `withRetry(fn, retries)` helper runs a function again if it throws. It stops after the last retry and throws the final error. If you leave out `retries`, it uses the configured default of 2, so a function runs up to 3 times in total. The helper does not wait between attempts.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30. If you rely on the old value, set the timeout yourself.

## Not included

CSV export for reports is not part of this release.
