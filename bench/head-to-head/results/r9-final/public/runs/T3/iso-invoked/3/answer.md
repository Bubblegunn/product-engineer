I wrote `PR.md`. I read the diff but did not run the tests.

The branch isn't purely formatting, even though its commit says "no functional change". [`src/pricing.js:3`](src/pricing.js#L3) changes `nightlyTotal` from `rate * nights` to `Math.floor(rate * nights * 100) / 100`. That rounds stay totals down and can lower a total by a cent. Floating-point error can also cost an extra cent in some cases. The branch adds no test for it.

`PR.md` opens with an overview for the account manager that covers the guest-facing effects. It then asks the reviewer to either remove the pricing change or keep it with a test. It also suggests `Math.round` if the change stays. Reminder emails, the CSV export and the booking list are unchanged.

I haven't changed the code or the commit message. You could fix the message, or move the pricing line into its own commit.