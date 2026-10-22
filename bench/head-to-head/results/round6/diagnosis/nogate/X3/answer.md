`docs/late-fees.md` is rewritten in short, simple sentences and committed as `311626b`.

- **Check:** I ran `product-engineer facts` on the old text against the new text. It reported no numbers added or dropped, no added sentences and no legalese. Sentences average 10.2 words, and the longest is 20.
- **Numbers:** All ten figures are unchanged: 21, 7, 3, $0.25, $1.00, $10.00, $5.00 (twice), 12 and 60.
- **Not checked:** The tool compares numbers and sentence counts only. I compared the meaning of each rule by reading, not with a tool.
- **Commit message:** It has the "For the customer" block, and also the Turkish "Sade dil" block that your CLAUDE.md asks for. `product-engineer check` reported no errors and no warnings. This is a docs-only change, so I added no test.

One wording change: "no one else has placed a hold" replaces "no other patron has placed a hold".