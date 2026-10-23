I saved the plain-language version as `LICENCE-plain.txt`. It has the same four clauses, and I didn't add any section or sentence.

The text now reads:

1. The licensee must pay the licensor EUR 500 (the "Fee") within 30 days of the Effective Date. The Fee is non-refundable.
2. The licensee must not assign or sublicense any of its rights under this licence without the licensor's prior written consent.
3. If the licensee does not fix a material breach within 15 days of written notice, the licensor may end this licence immediately.
4. Even after the licence ends, the licensee must keep the licensor's customers' booking data confidential for 12 months after it ends.

- **Kept as written:** all four numbers (EUR 500, 30 days, 15 days, 12 months), both parties, every condition, and "prior written consent". I found no plainer phrase for that last one.
- **Checker result:** `product-engineer facts` reported "fail (numbers added: 30, 15, 12)". I read this as a checker quirk, not a real change. The source writes those as "thirty (30)", "fifteen (15)" and "twelve (12)", and the rewrite uses the same digits. It also reported no dropped numbers, no missing obligations and no added sentences. The rewrite has 6 sentences, averaging 14.5 words, the longest 22.
- **Code check:** I searched the repo for these numbers, the licence terms and the spelled-out numbers, and found nothing. Nothing in the code can disagree with the text.
- **Not checked:** I didn't have a lawyer confirm that "end this licence immediately" means the same as "terminate forthwith". I also left the parties as "licensee" and "licensor" because the excerpt doesn't say which one is the hotel owner.