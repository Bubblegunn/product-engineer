# Sweep: CLI against plain-git references on public repositories

`sweep.mjs` clones the repositories in `repos.json`, runs the CLI commands
(`range`, `scope`, `stubs`, `check --diff`) on three ranges per repository, and
compares each output with a reference computed with plain `git` (and `gitleaks`
for secrets, when installed). Results go to `/private/tmp/pe-sweep/results.json`;
a copy is kept as `results.json` next to this file.

Run it:

    node bench/head-to-head/sweep/sweep.mjs              # all repositories
    node bench/head-to-head/sweep/sweep.mjs nvm-sh__nvm  # one or more by name

Requirements: git, Node 22 or newer, network access to github.com for `git clone`.
`gitleaks` is optional; without it the secret comparison is skipped and the
digest says so.

## Ranges

- **R1**: the first pair of consecutive semver tags (newest first, reachable
  from HEAD) that are 5 to 300 commits apart. If no pair qualifies, the last
  60 commits (`HEAD~60..HEAD`).
- **R2**: the most recent merge commit whose first-parent range (`m^1..m`) is
  1 to 300 commits. Skipped if none qualifies.
- **R3**: the newest semver tag against the one before it, with no size limit.
  Skipped when it equals R1.

Clones are shallow (`--depth 400 --no-single-branch --tags`); a repository that
fails to clone twice is recorded as skipped.

## Commands and limits

- Every command runs with a 120 s timeout. Timeouts are recorded.
- `check --diff` gets the tip commit's message in a scratch file and runs with
  `--references off`, so it does not touch the network.
- A `--json` command whose piped stdout does not parse is re-run with stdout
  written to a file. The pipe run is the record (it is what a user gets); the
  file run only supplies complete output for the references. A pipe-cut run is
  recorded as a crash with the issue text `stdout cut off at N bytes on a pipe`.
- Commands run sequentially so timings are not inflated by the harness itself.
  Other processes on the same machine can still add load; the digest does not
  correct for that.

## Crash and noise rules

- Crash: a timeout is recorded separately. Any other signal, any exit code that
  is not 0 (and not the documented findings exit 1 of `stubs` and `check`),
  exception text on stderr, unparseable `--json` output, or the pipe truncation
  above.
- Noise: stderr output on exit 0.
- Slow: more than 10 s.

## References and the mapping each one assumes

| Record | Ours | Reference (plain git) | Mapping assumed |
|---|---|---|---|
| `ref:commit-count` | `commits.length` of `range --json` | `git rev-list --count A..B` | Same commit set, merges included. |
| `ref:revert-links` | flags `link` with text `reverts ...` | subject `Revert "` or body `This reverts commit` | Counts reverts whose target is in or out of range. |
| `ref:cancelled-set` | non-merge commits with `net.state == cancelled` and no link flag | odd number of revert/reapply events per commit, plus commits brought in by a cancelled merge with no own event | Reapply is `Reapply "` with a body naming the revert. |
| `ref:summary-cancelled` | `summary.cancelled` | size of the reference set above | Same definition. |
| `ref:duplicates` | flag `duplicate` | groups of equal `git patch-id --stable`; all but the oldest flagged | Merges and reverts excluded. |
| `ref:duplicate-literal-text` | pairs named by `same change as <short>` | normalised patch text (headers, `@@` lines removed) equal | Stricter than patch-id: whitespace matters here. |
| `ref:patch-id` | `patchId` per commit | `git patch-id --stable` per commit | Same tool, independent invocation. |
| `ref:type-vs-files` | flag `type` with text `type says ...` | conventional type in docs/test/chore/style/ci/build and a path that is not doc, test or config | Config is an approximation (lock files, JSON, YAML, TOML, dotfiles, `.github/`). A disagreement is a mapping gap until someone reads the diff. |
| `ref:scope-whitespace` | `whitespaceOnly` per file in `scope --json` | `git diff -w --numstat` with added+removed = 0 | CLI uses `diff -b --ignore-blank-lines`; the reference uses `-w` as specified. Blank-line-only changes are the expected source of disagreement. |
| `ref:stub-markers` | findings with code `stub-marker` | added lines (`--unified=0`, `+++` excluded) containing `TODO`, `FIXME` or `XXX` | The CLI only counts markers inside comment syntax; the reference counts any occurrence. The digest also prints the TODO|FIXME-only count and a comment-syntax approximation. |
| `ref:secret-hits` / `gitleaks git --log-opts` | `diff-secret-content` and `diff-secret-file` paths | files with a gitleaks finding over the range's commits | File-set comparison only. The CLI checks the net added lines; gitleaks checks every commit, so a secret added and later removed is a gitleaks-only hit. Values are never stored: the report is written with `--redact`, read for file, rule and line, and deleted. |

## Known limits of this run

- The 120 s timeout and the 10 s slow threshold are wall-clock on a shared machine.
- The references are written by the harness, not taken from the CLI's source.
  Where they differ, the difference is a finding about either side until read.
- `sqlite` was left out: its primary repository is not on GitHub.
- `notes`, `facts` and `claims` are not part of this sweep.
