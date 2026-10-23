`SUPPORT_NOTE.md` is in the repo root. It has 5 sentences and no code changes. The `product-engineer facts` check still prints "fail", but only because the note leaves out numbers from the raw diff (commit hash, line counts, test values). It reports no warnings. Support doesn't need those numbers.

The note says:

> Dana's latest change is labeled as a code cleanup, but it changes what customers pay for shipping.
> Standard shipping for orders below the free-shipping limit goes from $4.99 to $5.99.
> Free standard shipping now needs an order over $75, up from $50 before.
> An order exactly at the new limit now pays the fee, while an order exactly at the old limit used to ship free.
> Express shipping does not change and stays at $12.50.

**The commit message is wrong.** Dana's commit, `a9caaad`, is titled "Refactor shipping calc into named constants (no behaviour change)", but the diff does change behavior:
- **Standard fee:** it goes from $4.99 to $5.99.
- **Free-shipping threshold:** it goes from $50 to $75.
- **Boundary case:** an order of exactly $75 now pays the fee, because the check changed from `>=` to `>`. At the old $50 threshold, an order of exactly $50 shipped free.
- **Express:** it stays at $12.50.

Dana changed the standard-fee test to expect 5.99, so that change looks intentional. The new threshold has no test. Ask Dana whether the changes were intended and whether the commit message should be corrected.

**Corrections to the first version.** The claim check flagged two things. I removed the title line, which counted as a sentence with no source. I also removed the sentence saying the changes were on main but possibly not live, because the commit doesn't say that. That caveat still applies: I only read the code on main and don't know whether it has been deployed. Check that before you tell support these prices are live.