I saved the plain-language version as `LICENCE-plain.txt`. It keeps all four clauses and every number, party and condition from `LICENCE.txt`.

```
(1) The licensee must pay EUR 500 (the "Fee") to the licensor within 30 days of the Effective Date. The Fee is non-refundable.
(2) The licensee must not assign or sublicense any of its rights under this licence without the licensor's prior written consent.
(3) If the licensee does not fix a material breach within 15 days of written notice, the licensor may end this licence immediately.
(4) Even after the licence ends, the licensee must keep the licensor's customers' booking data confidential for 12 months after it ends.
```

- **Kept as written:** "prior written consent", "material breach", "assign or sublicense" and "Effective Date". I found no plainer words for them, and changing them could change the meaning.
- **Fact check:** I ran `product-engineer facts LICENCE.txt LICENCE-plain.txt`. It reported no dropped numbers, no lost obligations, no leftover legalese and no sentences that don't trace to the source. The rewrite has 6 sentences, averaging 14.7 words, with the longest at 22.
- **Why it printed "fail":** it flagged 30, 15 and 12 as "added". The source gives those as "thirty (30)", "fifteen (15)" and "twelve (12)", so they are the same values. This is a quirk of the checker, not a change to the terms.
- **Code check:** I searched the repo for the figure 500, the spelled-out numbers, "confidential" and "refund". Nothing outside the two licence files mentions them, so there is nothing to disagree with.
- **Not checked:** I haven't had a lawyer confirm the plain wording means the same as the original. I didn't commit anything, and `LICENCE.txt` is still untracked.