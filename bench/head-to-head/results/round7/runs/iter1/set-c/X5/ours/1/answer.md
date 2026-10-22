`SUPPORT_NOTE.md` is written in the repo root. The note has 4 sentences, under your 6-sentence limit. I changed no code and didn't commit.

**What the note tells support.** Dana's latest commit says "no behaviour change", but it does change shipping prices:
- Standard shipping goes from $4.99 to $5.99.
- Free standard shipping used to start at $50. It now applies only to orders above $75, so orders from $50 up to and including $75 now pay shipping.
- Express shipping is unchanged at $12.50.

**Tests.** I ran `npm test` after the last edit. It printed `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`. Dana changed the standard-fee test to expect $5.99. No test covers the free-shipping threshold change.

**Product-engineer check.** `product-engineer facts` now reports no sentences without a counterpart in the source, no obligations lost and no legalese. Its final line still says `result: fail`.
- The failure is the number comparison, which lists the commit's hashes, dates and line counts as "dropped".
- It also lists 50 and 75 as "added". Both come from the diff (`>= 50` before, `> 75` after).
- I didn't treat that as a real problem. I don't see how to clear it without putting commit metadata into a note meant for non-technical readers.

**Fixed after the first check.** I removed the title heading and the separate $50–$75 sentence, and folded that sentence into the free-shipping one. I also reworded the opening so it ties to the commit's own "no behaviour change" wording. I also dropped the commit date and the "once it is live" wording.

**Open points.**
- I can't tell whether Dana meant these price changes or made them by accident during the refactor. Ask Dana before support tells customers this is the new policy.
- I didn't check whether the change has been released. The note doesn't say it is live.