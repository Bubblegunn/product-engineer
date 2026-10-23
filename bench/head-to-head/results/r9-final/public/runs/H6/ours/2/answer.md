I saved the plain-language version as `LICENCE-plain.txt`. It is four clauses, in the same order as the original:

1. The licensee must pay the licensor EUR 500 within 30 days of the Effective Date. The fee is non-refundable.
2. The licensee must not assign or sublicense any of its rights under this licence without the licensor's prior written consent.
3. If the licensee does not fix a material breach within 15 days of written notice, the licensor may end this licence immediately.
4. Even after the licence ends, the licensee must keep the licensor's customers' booking data confidential for 12 months after termination.

- **Terms kept as written:** I kept "licensor" and "licensee", "Effective Date" and "prior written consent". I found no plainer word for them that wouldn't change the meaning. I added no definitions or explanations.
- **Checker result:** `product-engineer facts` reported "fail (numbers added: 30, 15, 12)". I checked those by hand, and I think the failure is a false alarm. The original writes them as "thirty (30)", "fifteen (15)" and "twelve (12)", and the checker only picked up the 500 from the source. The checker's other findings were clean. Dropped numbers: none. Sentences with no counterpart in the source: none. Average sentence length is 14.0 words, and the longest is 22.
- **Code check:** I searched the repository, excluding the two licence files, for the fee, the day and month counts, and the words "licence", "confidential" and "refund". Nothing matched, so there is nothing in the code to disagree with the text.
- **Not checked:** I haven't had a lawyer confirm that the plain wording means the same as the original. Treat `LICENCE.txt` as the binding text.