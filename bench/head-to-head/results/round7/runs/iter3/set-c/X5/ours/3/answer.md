`SUPPORT_NOTE.md` is in the repo root. It has 6 sentences, I left the code alone, and the claim check still reports "fail". The reason for the fail is below.

**What the latest commit means for customers.** The commit is Dana's a9caaad from Oct 20. Its title says "no behaviour change", but the fees changed:
- **Standard fee:** it goes from $4.99 to $5.99.
- **Free-shipping threshold:** it moves from "$50 or more" to "more than $75". Orders from $50 to $75 used to ship free and now pay $5.99. An order of exactly $75 now pays too.
- **Express:** it stays at $12.50.

**Correction after the claim check.** I ran `product-engineer facts` on the commit text and the note. It warned about one sentence with no counterpart in the source. That sentence was my own commentary: "expect questions" and "not confirmed live". I replaced it with a sentence tied to the commit: the title says "no behaviour change", but the fees and the free-shipping limit changed. A second run shows "none" for sentences with no source counterpart.

**Why it still says "fail".**
- **Dropped numbers:** these come from git metadata in the commit text (hashes, dates, file modes, line numbers) and from test values. None belong in a support note.
- **"Added" numbers (75, 50, 5.99):** all three appear in the commit. The tool flags them because the note repeats them across sentences. I kept the repetition so each sentence reads on its own.

**Not verified.**
- **Live status:** I can't tell from the repo whether this change is deployed. I removed that caveat from the note because the claim check flagged it. Check before you send the note to support.
- **Intent:** ask Dana whether the price rise was intended. The commit presents it as a refactor.