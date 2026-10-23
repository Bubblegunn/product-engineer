# fetchkit v1.3.0

## Action required: option renamed

The `maxItems` option has been renamed to `limit`. The old name is **no longer recognized**, with no fallback. If you pass `maxItems` to `fetchAll`, it will be silently ignored and the default limit of 100 will apply.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

## What's new

- **Retry helper.** fetchkit now exports `withRetry(fn, retries)`. It calls `fn` and, if it throws, tries again up to `retries` more times (default 2). If every attempt fails, it throws the last error. The helper is synchronous and has no delay between attempts. `fetchAll` does not call it for you, so wrap your own calls where you want retries.
- **New `retries` default.** The default config now includes `retries: 2`.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30.

## Not included

CSV export for reports is not part of this release. It was added during development and then removed before release. The README currently still mentions it, which is an error.
