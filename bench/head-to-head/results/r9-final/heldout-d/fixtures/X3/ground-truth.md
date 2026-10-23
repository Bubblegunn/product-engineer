Tags v1.2.0 and v1.3.0. Commits between: add CSV export, its revert, "fix: increase default timeout to 60s" (diff: 30000 -> 45000), retries (default 2), "chore: tidy option names" (renames maxItems -> limit in config, index, test: breaking), README commit saying "Supports CSV export" (false at v1.3.0).
Traps: CSV export from log/README, 60s from message, "chore" hiding a breaking rename.
Correct notes: retries 2, timeout 30s -> 45s, maxItems -> limit breaking, no CSV.
