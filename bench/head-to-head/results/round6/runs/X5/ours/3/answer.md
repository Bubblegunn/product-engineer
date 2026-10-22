`SUPPORT_NOTE.md` is in the repo root and now has 5 sentences. I changed no code and made no commit. The claim check I ran still reports `fail` on numbers, for the reasons below.

**What Dana's commit does for customers:** its title says "no behaviour change", but prices did change.
- **Standard shipping:** the fee goes from 4.99 to 5.99.
- **Free shipping:** the minimum goes from 50 or more to over 75. Orders between 50 and 75 used to ship free and now pay 5.99. An order of exactly 75 also pays.
- **Express shipping:** unchanged at 12.5.

Dana also edited the test to expect 5.99, so the change looks deliberate. You may want to confirm with Dana that the new prices are intended.

**The claim check (`product-engineer facts`):**
- **First run:** it flagged 3 sentences with no counterpart in the source. These were the heading, my "customers may notice and ask" sentence, and my "please confirm with Dana" sentence.
- **My fixes:** I removed the heading and the "confirm with Dana" advice from the note. The advice is in this reply instead, since it isn't in the commit. I reworded the "no behaviour change" sentence to tie it to the commit title. I also wrote express as `12.5` so it matches the source.
- **Second run:** it reports no unmatched sentences, no legalese and no missing obligations. Average sentence length is 19.0 words, against a limit of 20.
- **Numbers still reported:** "numbers dropped" lists commit hashes, dates, diff line numbers and test values, which a support note shouldn't carry. "Numbers added" lists 75, 50, 75. These come from the source, but the note repeats them more often than the code does, because it explains the free-shipping change in more than one sentence. I left them as they are.