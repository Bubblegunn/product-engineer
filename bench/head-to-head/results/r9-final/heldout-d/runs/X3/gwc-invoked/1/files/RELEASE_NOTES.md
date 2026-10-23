# fetchkit v1.3.0 Release Notes

Changes since v1.2.0.

## 💥 Action required: option renamed

The `maxItems` option has been renamed to `limit`. This applies both to the option you pass to `fetchAll` and to the default in the config.

```js
// before (v1.2.0)
fetchAll(client, { maxItems: 50 });

// now (v1.3.0)
fetchAll(client, { limit: 50 });
```

`maxItems` is no longer read, so code that still passes it will silently fall back to the default limit of 100. Search your integration for `maxItems` and update it when you upgrade.

## 🚀 New

- **Automatic retries.** A new `withRetry` helper is exported. It re-runs a failing call, by default 2 more times (3 attempts in total), and throws the last error if every attempt fails. You can pass your own retry count as the second argument.

## 🔧 Changed defaults

- **Longer default timeout.** The default request timeout is now 45 seconds, up from 30. If you depend on the old value, set the timeout explicitly.

## 📚 Documentation

- A README was added for the package.

## Not included

CSV export for reports was added and then reverted during this cycle, so it is not part of v1.3.0.
