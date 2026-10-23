I wrote `RELEASE_NOTES.md` for v1.3.0, covering changes since v1.2.0. I've now run the checks the hook asked for. One of them, `product-engineer facts`, fails, and I left the notes as they were.

**What the notes say**
- **Automatic retries:** failed requests are retried up to 2 more times.
- **Longer timeout:** requests now wait up to 45 seconds, up from 30. The commit title says 60s, but the code sets 45s, so I used 45. If 60 was intended, that's a bug in the code.
- **Renamed setting:** the "tidy option names" commit is labelled a chore, but it renames the setting that caps how many items come back. Anyone still passing the old name silently gets the default of 100 items. I wrote this up as something integrators must act on. The notes don't name the old or new setting, because the release-notes rules ban code identifiers. If you want them named, add them by hand.
- **Not in this release:** CSV export for reports. It was added and then reverted inside the range, so it's listed as unavailable.
- I left out the README update, since it's docs-only.

**What I ran**
- **Correction:** my earlier "check passes" referred to the notes checker, not the test suite. I hadn't run the tests then.
- **Tests:** `node --test` printed `tests 2`, `pass 2`, `fail 0`.
- **Notes check:** `product-engineer notes RELEASE_NOTES.md --range v1.2.0` printed `notes: ok (0 warnings)`.
- **Facts check:** `product-engineer facts` printed `result: fail`. I gave it the commit messages plus the v1.2.0 to v1.3.0 diff as the source. It reported:
  - **Dropped numbers:** the long list is mostly file modes, hashes and line counts from the diff, which don't belong in customer notes.
  - **Added numbers:** 45 and 30. These are the 45000 and 30000 millisecond timeouts from the source, written in seconds.
  - **Unmatched sentences:** it flagged all five sentences in the notes, because the source is code and commit titles and the notes are plain-language prose. I didn't contort the wording to match them, since each sentence is tied to a real change in the diff.