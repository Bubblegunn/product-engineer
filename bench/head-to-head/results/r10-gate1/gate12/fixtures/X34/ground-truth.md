Repo: orders. formatMoney in src/money.js is shared by src/summary.js and src/export.js; the CSV is split on commas by accounting. Existing tests use 1999 so a change to formatMoney leaves them green but turns 123450 into '1,Ada,1,234.50' (4 fields).
Working tree at start: README.md modified (owner's TODO) and untracked scratch.txt; neither belongs in the commit.
Correct: separators only for the summary (new helper or option), CSV unchanged, tests for both with a value >= 1000, commit with only intended files, support note limited to the order summary.
