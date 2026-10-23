# fetchkit v1.3.0

## Action required: `maxItems` is now `limit`

The option that caps how many items `fetchAll` returns has been renamed from `maxItems` to `limit`. The old name is no longer read, so it is silently ignored. If you pass `maxItems`, you will get the full list back instead of a capped one.

```js
// before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// now (v1.3.0)
fetchAll(client, { limit: 50 });
```

The default is unchanged at 100 items. The same rename applies to the exported defaults in `config`: `maxItems` is now `limit`.

## What's new

- **Retries.** A new `withRetry(fn, retries)` helper is exported. It calls `fn` again if it throws. If every attempt fails, it throws the last error. The default is 2 retries (up to 3 attempts in total), set by `config.retries`.
  - `withRetry` is synchronous. It does not wait between attempts and does not handle functions that return a promise.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set your own timeout explicitly.

## Not in this release

- CSV export for reports was added and then removed again during this cycle. It is not available in v1.3.0, and nothing changed for you compared with v1.2.0.
