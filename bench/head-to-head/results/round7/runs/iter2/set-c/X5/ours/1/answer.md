`SUPPORT_NOTE.md` is in the repo root, and I didn't change any code. The only new file is the note, which is untracked and not committed.

The note says Dana's commit is labelled "no behaviour change" but does change what customers pay for shipping:
- **Standard shipping:** 5.99 instead of 4.99.
- **Free shipping:** it now starts above 75 instead of from 50. Orders from 50 up to and including 75 used to ship free and now pay 5.99.
- **Express shipping:** unchanged at 12.50.

It is five sentences plus a one-line header, with no code or file names. `product-engineer notes` passes with 0 warnings.

**Claim check:** `product-engineer facts` failed on the first run because of two sentences. I deleted the second one, my caveat about not knowing whether the price rise was intended. That caveat is in this message instead (see the last paragraph).

The first one is still flagged: "Standard shipping now costs 5.99 instead of 4.99." I kept it because it restates the change from 4.99 to 5.99 in the diff. The checker compares words, and the source is code, so no wording of it would match.

The remaining number warnings are not problems:
- **"Dropped" numbers:** these are commit hashes, the date, line counts and test values from the diff.
- **"Added" numbers:** 5 and 6 are digits from the commit hashes in the header line. 50 and 75 are in the diff.

I got the amounts by reading the diff, not by placing a live order. I couldn't tell whether the price rise was intended, so ask Dana before telling customers whether it's deliberate.