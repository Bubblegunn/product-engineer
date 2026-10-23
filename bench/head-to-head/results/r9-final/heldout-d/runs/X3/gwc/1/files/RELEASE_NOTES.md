# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option has been renamed to `limit`. This applies both to the option you pass to `fetchAll` and to the default in the config. The old name is no longer recognized, so code that still passes `maxItems` will silently get the default limit of 100 instead of your value.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

## What's new

- **Automatic retries.** A new `withRetry` helper re-runs a failing call before giving up. By default it retries up to 2 times (3 attempts in total) and throws the last error if every attempt fails. You can pass a different retry count as the second argument.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set the timeout explicitly.

## Notes

- CSV export of reports is not part of this release. It was added and then removed again during the v1.3.0 cycle, so it is not available in v1.2.0 or v1.3.0.
