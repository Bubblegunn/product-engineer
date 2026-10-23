I committed the change as `498a4c8`.

**What to tell the hotel owner:** Nothing has changed for their guests. I moved the reminder email wording into its own file, `src/messages.js`, and the subject and body text is word-for-word the same as before. It only makes the wording easier to find and edit later. If the owner wants different wording, that is now a small change in one place.

I only read the diff and didn't run the code or any tests. The "identical output" claim comes from comparing the old and new template strings, which match exactly.