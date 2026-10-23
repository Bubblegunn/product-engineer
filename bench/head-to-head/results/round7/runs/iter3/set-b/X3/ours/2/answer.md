`docs/late-fees.md` is rewritten in short sentences under plain headings, and I committed it as `8d596b2`.

**What I checked**
- After the commit, `git log --oneline -1` showed `8d596b2` and `git status --short` printed nothing.
- I did not run `git status`, `git diff` or `git log` before my first edit. I know the starting state only from the snapshot at the start of the session, which showed a clean tree on `main`. I did not verify that myself.
- I compared the old and new text rule by rule. I did not run any tests, because the change is docs-only.

**Rules kept, with the same numbers and conditions**
- **Loans:** 21 days, or 7 days for DVDs. An item can be renewed twice, only if no other patron has a hold on it.
- **Grace period:** 3 days with no fee. DVDs get none.
- **Fees:** $0.25 per day for books and $1.00 per day for DVDs, capped at $10.00 per item.
- **Borrowing:** suspended at $5.00 or more owed, and restored once the total drops below $5.00.
- **Under 12:** cards issued to patrons under 12 are exempt from late fees.
- **Lost items:** billed as lost if still unreturned 60 days after the due date.

I did not change the policy's gaps, such as whether the lost-item bill applies to under-12 cards. The old text doesn't say, so the new text doesn't either.

**Commit message**
It carries the "For the customer" block in English. Your global instructions ask for a Turkish "Sade dil" section, and I followed the skill's format instead. Say so if you want the Turkish format.