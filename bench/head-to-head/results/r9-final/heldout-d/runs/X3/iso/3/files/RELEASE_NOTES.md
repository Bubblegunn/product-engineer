# fetchkit v1.3.0

## Action required: `maxItems` is now `limit`

The `maxItems` option has been renamed to `limit`. The old name is no longer read. If you pass `maxItems`, it is ignored and `fetchAll` returns up to the default of 100 items.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

The default value (100) has not changed. If you don't pass this option, you don't need to change anything.

## What's new

- **Retry helper.** fetchkit now exports `withRetry(fn, retries)`. It calls `fn` and, if it throws, tries again. It stops after `retries` retries and then throws the last error. The default is 2 retries, so `fn` runs up to 3 times in total.
  - `withRetry` is a helper you call yourself. `fetchAll` does not retry on its own.
  - It runs `fn` straight away, with no delay between attempts.
  - It works with functions that return a value directly. It does not wait for promises, so it won't retry an `async` function that rejects.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set your own timeout explicitly.

## Not in this release

- **CSV export for reports** was added and then removed again during this release cycle. It is not part of v1.3.0, even though the README may still mention it.
