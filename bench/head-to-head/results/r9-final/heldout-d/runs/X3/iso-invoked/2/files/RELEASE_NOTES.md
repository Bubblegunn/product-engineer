# fetchkit 1.3.0 release notes

Version 1.3.0, released 14 August 2026. This document tells developers who integrate fetchkit what changed since 1.2.0 and what to do before upgrading.

## Overview

Version 1.3.0 contains one breaking change. The `maxItems` option is now called `limit`. If you pass `maxItems`, rename it before you upgrade, or fetchkit will ignore it and return every item.

The release also adds a `withRetry` helper, raises the default timeout from 30 to 45 seconds, and adds a `retries` setting. CSV export is not part of this release.

## Rename `maxItems` to `limit`

The option that caps how many items `fetchAll` returns is now `limit`. The default config key changed the same way. The default value is still 100.

1. **Find uses:** Search your code for `maxItems`.
2. **Rename:** Replace each `maxItems` with `limit`.

Before:

```js
fetchAll(client, { maxItems: 2 });
```

After:

```js
fetchAll(client, { limit: 2 });
```

fetchkit 1.3.0 does not read `maxItems`. If you leave it in place, `fetchAll` uses the default limit of 100 and no error appears. The change is in [src/index.js, line 4](file://<WORK>/runs/X3-iso-invoked-2/repo/src/index.js#L4) and [src/config.js, line 1](file://<WORK>/runs/X3-iso-invoked-2/repo/src/config.js#L1).

## Retry failed calls with `withRetry`

The new `withRetry(fn, retries)` function calls `fn` again when it throws. It returns the first successful result. If every attempt fails, it throws the last error.

- **Default retries:** `retries` defaults to 2, so `fn` runs up to 3 times in total. You can set the default in config or pass a number as the second argument.
- **Synchronous only:** `withRetry` catches errors that `fn` throws directly. It does not wait for promises, so it does not retry an `async` function that rejects.
- **Not automatic:** `fetchAll` does not retry by itself. Wrap your call in `withRetry` where you want retries.

```js
const { fetchAll, withRetry } = require('fetchkit');

const items = withRetry(() => fetchAll(client, { limit: 50 }));
```

The code is in [src/index.js, lines 6 to 12](file://<WORK>/runs/X3-iso-invoked-2/repo/src/index.js#L6-L12).

## Check your timeout settings

The default timeout rose from 30 seconds to 45 seconds (`timeoutMs: 45000`). If you rely on the default, requests now wait up to 15 seconds longer before they time out. To keep the old behaviour, set `timeoutMs` to `30000` yourself.

## CSV export is not available

The README in this release says fetchkit supports CSV export of reports. That statement is wrong. We added CSV export during development and then removed it before release. No CSV export code ships in 1.3.0.

## Summary of changes

| Area | In 1.2.0 | In 1.3.0 | Action |
|------|----------|----------|--------|
| Result cap option | `maxItems` | `limit` | Rename in your code |
| Result cap config key | `maxItems` | `limit` | Rename in your config |
| Default timeout | 30000 ms | 45000 ms | Set `timeoutMs` to keep 30 seconds |
| Retries | Not available | `withRetry`, default `retries: 2` | Use if you want retries |
| CSV export | Not available | Not available | None |
