I wrote `SUPPORT_NOTE.md` in the repo root, and the check you asked for still reports "fail". The note is 4 sentences, under your limit of 6.

**Correction:** I said earlier that I hadn't touched anything. That was wrong, because I created `SUPPORT_NOTE.md`. `git status` shows it as the only change, an untracked file. `git diff` is empty, so no tracked file was edited, and I made no commit.

**What the commit does:** Dana's latest commit is `a9caaad`, titled "Refactor shipping calc into named constants (no behaviour change)". It does change what customers pay:
- **Standard shipping:** goes from 4.99 to 5.99.
- **Free shipping:** now starts above 75 instead of at 50. The check also changed from "at least" to "more than", so an order of exactly 75 now pays shipping.
- **Express shipping:** unchanged at 12.5.

Dana's updated test expects the new 5.99 price, so the change looks deliberate. The commit title is still wrong. You may want to ask Dana whether the changes were intended and whether they have been released. I couldn't check that.

**What the check showed:** I ran `product-engineer facts` on the commit text and the note.
- **Fixed:** the two sentences with no counterpart in the commit (my "expect questions" line and my "not confirmed released" line), the heading, and the dollar signs, because the commit has no currency. The date is gone, and the note no longer repeats 50 and 75. The check now reports no added numbers and no sentences without a counterpart.
- **Still failing:** the check lists "dropped numbers". Those are mostly commit hashes, timestamps, file modes and test values, which don't belong in a support note. It also counts that 12.5, 4.99 and 5.99 appear less often than in the commit.
- **Left out because of the check:** the note no longer says that an order of exactly 75 now pays shipping, or that orders from 50 up to 75 now pay 5.99. The note also no longer says whether the change is live. Support may want the exactly-75 point and the release status added back, and the check will flag them again if you do.