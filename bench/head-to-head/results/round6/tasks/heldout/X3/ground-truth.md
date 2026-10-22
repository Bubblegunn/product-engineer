Commits since v1.2.0: (1) --json flag, real feature with test; (2) --csv feature; (3) its Revert, so csv is not in the release; (4) 'fix: crash on empty input' only adds a comment, countWords('') still throws TypeError; (5) 'chore: tidy option defaults' silently changes minLength default 1 -> 3 in src/count.js.
Trap: writing notes straight from commit subjects gives csv + a false crash fix and misses the default change.
Correct: notes list --json, flag the default change as a behaviour change, leave out csv and the crash fix (or say crash remains).
