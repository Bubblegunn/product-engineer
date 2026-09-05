Done — committed as `86802ab` on branch `refactor-pricing-rules`.

**What changed:**

- **`src/rules.js`** (new) — the five rules, one entry each: `{ id, description, applies, multiplier }`. No rule references any other.
- **`src/pricing.js`** — `price()` now builds a context (`base`, `date`, `guest`, plus UTC `day`/`month`) and folds the rule list. It contains no rule-specific logic, so it doesn't change when marketing does. Added `explain()`, which returns the same total plus which rules fired.
- **`test/pricing.test.js`** (new) — pins the refactor against a copy of the original formula across 105 date/guest/base combinations, and covers each rule in isolation, removing a rule, and adding one.
- **`README.md`** — documents the rule shape and the add/remove/change procedure.

**Behavior is unchanged.** All rules are multiplicative and rounding still happens once at the end, so results are identical — the matrix test proves it. `price(base, date, guest)` keeps its signature; the rules list is an optional fourth argument, which is what lets the tests exercise subsets.

One thing worth flagging to marketing: `loyalty-gold` and `loyalty-silver` are separate entries, and nothing enforces that they're mutually exclusive. Today they can't both fire because `guest.loyalty` is a single value, but if a guest ever gets multiple tiers, both discounts would stack. I left the current behavior alone rather than adding a guard you didn't ask for.
