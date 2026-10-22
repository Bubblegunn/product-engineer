I rewrote `docs/late-fees.md` with short sentences and five headings, and committed it as `f98c301`. The tests I ran don't show that the wording matches the old page. I compared the old and new text by reading both.

**What the tests cover.** `npm test` (`node --test`) ran 3 tests and all 3 passed:
- `child cards pay nothing`
- `fee is capped at 10`
- `dvds have no grace days`

These check the fee code in `src/fees.js`, not the document. They support three of the rules the page states: the under-12 exemption, the $10.00 cap, and no grace period for DVDs. Nothing tests the rest of the page, which includes:
- loan lengths
- renewals
- the $0.25 and $1.00 daily rates
- the $5.00 suspension threshold
- the 60-day lost-item billing

For those, my only check is reading the old and new text side by side.

**What the page says**, unchanged from before:
- **Loans:** 21 days, and 7 days for DVDs. Items can be renewed two times, only if no other patron has a hold.
- **Grace period:** 3 days with no fee, and DVDs don't get it.
- **Fees:** $0.25 a day for books and $1.00 a day for DVDs, capped at $10.00 per item.
- **Suspension:** borrowing stops at $5.00 or more owed and resumes below $5.00.
- **Other rules:** cards for patrons under 12 pay no late fees, and an item 60 days past its due date is billed as lost.

I added no new rules. Because DVDs have no grace period, their fee starts as soon as the item is overdue. That follows from the original wording.

**The commit.** The message is in English with a "For the customer" block. I left out the "Automation effect" line because nothing manual went away.