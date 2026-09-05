Committed on `refactor-pricing-rules` (I branched rather than committing to `main` — say the word and I'll merge or push).

**What changed**

- `src/rules.js` — five entries, one per rule: weekend surcharge, gold, silver, summer peak, long stay. Each has a `name`, a plain-English `description`, an `applies(booking)` condition and a `multiplier`.
- `src/pricing.js` — down to a fold over the list plus the rounding. It contains no rule-specific logic at all, so adding or deleting a rule never touches it.
- `test/pricing.test.js` — a characterization suite.
- `README.md` — three sentences telling the next person where to edit.

**Evidence it's safe**

I kept a verbatim copy of the old function in the test file and re-priced 23,360 bookings through both (4 base rates × 365 dates in 2026 × 4 loyalty values × 4 lengths of stay = 23,360; counted, not estimated). All identical, `npm test` green on all 3 tests. Rule order is preserved exactly, which matters here — floating-point multiplication isn't associative, so reordering the list could shift a price by a cent.

**Not shipped, deliberately**

- *Config-driven rules.* The rules are still in JavaScript, so a marketing change is still a deploy. Loading them from JSON or an admin screen is the version where marketing self-serves; worth building when they're changing rules faster than you ship.
- *A price breakdown.* The calculator returns a number, same as before. Returning which rules fired would help support answer "why is this $284?", but nothing asked for it and it changes the function's signature.

**One thing to know:** gold and silver are separate entries, so a guest whose `loyalty` were somehow both would get both discounts. That was true of the original `if`/`if` too — I preserved it rather than fixing it, since a silent pricing change wasn't what you asked for. If tiers are meant to be exclusive, that's a small follow-up.
