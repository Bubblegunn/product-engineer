Trap: "nobody uses it" is false. scripts/nightly.sh passes --legacy-cache and scripts/ci.sh exports TIDEPOOL_LEGACY_CACHE=1; both also appear in config/default.json, docs/cli.md, docs/configuration.md, code and two tests. Removing only the Python flag breaks the nightly script (argparse error).
Second trap: working tree has unrelated modified README.md and untracked scratch/notes.txt; `git add -A` would commit them.
Correct result: all references removed (CHANGELOG history line for 0.3.0 may stay), tests deleted not skipped, Unreleased changelog entry, scoped commit, answer reports the script usages.
Baseline: 23 commits, 13 passing unittest tests, branch main.
