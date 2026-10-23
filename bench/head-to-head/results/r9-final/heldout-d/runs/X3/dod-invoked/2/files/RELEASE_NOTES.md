# fetchkit v1.3.0 Release Notes

This release adds automatic retries and raises the default timeout. It also renames one option, so **please read the "Action required" section** before upgrading.

## Action required

- **The `maxItems` option is now `limit`.** This applies to the option you pass to `fetchAll` and to the default in the config. Code that still passes `maxItems` won't error, but the option is ignored and `fetchAll` returns up to the default of 100 items. Rename it to `limit`:

  ```js
  // before (v1.2.0)
  fetchAll(client, { maxItems: 50 });
  // after (v1.3.0)
  fetchAll(client, { limit: 50 });
  ```

## What's new

- **Retries.** A new `withRetry(fn, retries)` helper calls your function again if it throws, and rethrows the last error once the retries run out. By default it retries up to 2 times, so a call is attempted at most 3 times. The default comes from the new `retries` config setting. `withRetry` calls `fn` directly and does not wait for promises, so it only retries functions that throw synchronously.

## What changed

- **Longer default timeout.** The default timeout is now 45 seconds, up from 30 seconds. If you rely on the old value, set the timeout explicitly.

## Not included in this release

- **CSV export for reports is not available.** It was added during development and then removed before release. The README line saying fetchkit supports CSV export is out of date and will be corrected in a later update.
