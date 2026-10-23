I saved the description to `PR.md`, and it flags a problem on this branch.

The commit is labelled "no functional change", but `src/pricing.js` does change behaviour. `nightlyTotal` now rounds down to whole cents with `Math.floor(rate * nights * 100) / 100`. That can make a total one cent too low. For example, 0.29 × 1 night now gives 0.28, and 4.35 × 1 night now gives 4.34. If the total feeds invoices or payments, guests could be undercharged. I didn't check what calls `nightlyTotal`.

The description tells the account manager this in plain terms. It recommends removing that line, or moving it to a separate change that rounds to the nearest cent and has tests. I haven't touched the code.

Everything else is formatting only, including the reminder email text, which is identical. `node --test` passes 5 of 5, but none of those tests cover `nightlyTotal`.