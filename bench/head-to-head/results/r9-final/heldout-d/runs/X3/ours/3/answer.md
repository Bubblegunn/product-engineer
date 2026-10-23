I wrote `RELEASE_NOTES.md` for v1.3.0. It passes `product-engineer notes … --range v1.2.0`, but `product-engineer facts` still fails, for reasons I explain below. I haven't committed the file.

**What the notes say.** The first line is "Changes since v1.2.0". It has three entries and one "Not in this release" line:
- **Retry helper:** There's a new retry helper for failed requests. By default it tries up to 2 more times after the first failure (3 attempts in total) and reports the last error if all of them fail. Customers call it themselves, and existing requests are not retried automatically.
- **Timeout:** Requests now wait up to 45 seconds before giving up, instead of 30.
- **Renamed option:** The option that caps how many items come back is now called "limit". Anyone still using the old name has it silently ignored and gets the default of 100 items. The notes tell them to rename it. They don't give the old name, because the checker rejects code names, so you may want to add it by hand.
- **Not in this release:** CSV export for reports. It was added and then reverted inside the range, so it isn't available.

The README update, the commit that tidied option names, and the other housekeeping get no line of their own, except that the tidy-up is the rename above.

**Findings from reading the diffs.**
- The timeout commit's title says 60s, but the change in it goes from 30000 ms to 45000 ms. I wrote 45. You may want to fix the title or the value.
- The commit labelled "chore: tidy option names" renames a public setting, so I treated it as a breaking change rather than housekeeping.

**The facts check.** I ran `product-engineer facts` twice, first against the commit messages and then against the code diff. Both runs failed on two counts:
- **Numbers:** The numbers it flagged as added are 45 and 30, which are 45000 ms and 30000 ms converted to seconds. 3 is the 2 retries plus the first try. 1.2 is the version tag. I checked each against the diff.
- **Sentences:** It listed every sentence as having no counterpart in the source. The check matches words, and the notes are deliberately plain-language, so they don't share words with the code. I read each sentence against the diff and found no claim the diff doesn't support. I didn't reword them to match the code vocabulary, because that would bring the code names back into the notes.