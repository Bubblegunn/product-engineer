# fetchkit 1.3.0 release notes

Read this to decide what to change in your code before you upgrade from 1.2.0 to 1.3.0. It is written for developers who integrate fetchkit.

Version: 1.3.0 (previous release: 1.2.0)

## Summary

Version 1.3.0 contains one breaking change. The option `maxItems` is now `limit`, and the old name no longer works. Update your calls before you upgrade.

This release also raises the default timeout from 30 to 45 seconds and adds a `withRetry` helper.

## Breaking change: rename `maxItems` to `limit`

The option that caps the number of items `fetchAll` returns has a new name. The default value, 100, is unchanged.

If you still pass `maxItems`, fetchkit ignores it and returns up to 100 items.

Before:

```js
fetchAll(client, { maxItems: 50 });
```

After:

```js
fetchAll(client, { limit: 50 });
```

If you read the setting from fetchkit's config, `config.maxItems` is now `config.limit`.

## Changes to defaults

- **Longer timeout:** The default timeout is now 45 seconds (`timeoutMs: 45000`). It was 30 seconds. If your integration depends on the old value, set the timeout yourself.
- **Retry count:** A new default setting, `retries: 2`, controls how many times `withRetry` tries again after a failure.

## New: `withRetry`

`withRetry(fn, retries)` calls `fn` and, if it throws, calls it again. It stops after the first success. You can pass `retries` to override the default of 2.

With the default, `fn` runs at most 3 times: the first attempt plus 2 retries. If every attempt fails, `withRetry` throws the error from the last attempt.

```js
const { withRetry } = require('fetchkit');

const items = withRetry(() => fetchAll(client, { limit: 50 }));
```

Two limits to know about:

- **Opt-in:** `fetchAll` does not retry on its own. Wrap your call in `withRetry` to get retries.
- **Synchronous only:** `withRetry` does not wait for a promise. If `fn` returns a promise that later rejects, `withRetry` does not retry it.

## Not in this release

- **CSV export:** We added CSV export for reports during this cycle and then removed it before release. Version 1.3.0 has no CSV export. The README sentence "Supports CSV export of reports" is wrong, and we will correct it.
