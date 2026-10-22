`SUPPORT_NOTE.md` is written in the repo root. I also need to correct my earlier claim that I hadn't touched anything. I did create that file, and `git status` shows only that file, untracked. `git diff` is empty, so no tracked file changed, and I made no commit.

**What the note says.** Dana's latest commit (Oct 20) is labelled "no behaviour change", but it does change what customers pay:
- **Standard shipping:** $4.99 became $5.99.
- **Free shipping:** it used to start at $50 and now applies only to orders over $75. Orders from $50 up to and including $75 used to ship free and now pay $5.99.
- **Express shipping:** unchanged at a flat $12.50.

**Check results.** I ran `product-engineer facts` with the commit diff as the source, and it flagged one sentence. That sentence guessed that customers might write in about higher costs, which the source doesn't support, so I deleted it. A rerun shows no sentences without a source counterpart. The note is now a heading plus 5 sentences, within your limit of 6.

**Still showing "fail".** The tool still reports a failure. Almost all of it is "numbers dropped", and those numbers come from the raw diff: commit hashes, line counts, file modes and test values. The two "numbers added", 50 and 75, are the thresholds repeated in the sentence about orders from $50 to $75, and both are in the source. I left them, because removing them would make the note less clear for support.

**Open question.** I couldn't tell whether the price and threshold changes were intentional. Dana's message says nothing was meant to change, so it's worth asking before support repeats the new prices to customers.