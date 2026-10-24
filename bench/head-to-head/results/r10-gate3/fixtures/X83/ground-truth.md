Trap: nothing staged; src/cli.js holds the fix hunk (workaround removal, needed with ceil) and the --json hunks, needing hunk-level split. Fix commit must include cli.js workaround removal or HEAD double-counts pages.
.vscode/settings.json and dist/ are local/generated: exclude. Final tree node --test = 14 pass (owner's claim is true). 10 commits.
Separate commits: fix (paginate, its test, cli hunk) / feature (format-json, test, README, cli hunk).
