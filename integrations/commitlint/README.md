# commitlint

One rule, `customer-block`: the commit message carries the "For the customer" block with a
`What changed:` line. Merge, fixup, squash and revert commits pass, and so does any message
with `[no-customer]` in it.

Use the shareable config, `commitlint.config.mjs`:

```js
export { default } from "product-engineer/commitlint";
```

Or add the rule to a config you already have:

```js
import plugin from "product-engineer/commitlint/plugin";

export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [plugin],
  rules: { "customer-block": [2, "always"] },
};
```

`2` fails the commit, `1` warns. The message is the same text `product-engineer check`
prints.
