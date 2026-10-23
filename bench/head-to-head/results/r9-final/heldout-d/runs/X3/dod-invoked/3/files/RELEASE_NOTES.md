# fetchkit 1.3.0

This release adds automatic retries and renames two options. **The option rename can break existing integrations, so read "Action required" before upgrading.**

## Action required

- **`maxItems` is now `limit`.** This applies to the option you pass to `fetchAll` (`fetchAll(client, { limit: 50 })`) and to the default in the config. Code that still passes `maxItems` is silently ignored, and `fetchAll` returns up to the default of 100 items. Rename it in your calls.

## What's new

- **Retries.** A new `withRetry(fn, retries)` helper runs your function again if it throws, and rethrows the last error once the retries run out. The default is 2 retries (3 attempts in total), set by the new `retries` config value.

## What changed

- **Longer default timeout.** The default request timeout is now 45 seconds, up from 30 seconds. If you relied on the old value, set your timeout explicitly.

## Not included

- **CSV export for reports is not part of this release.** It was added and then removed again during development. The README says fetchkit supports CSV export. That line is wrong and will be corrected.
