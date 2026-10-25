# r11 development gate 4 (2026-10-25): I1 holds

Protocol `docs/DEV-GATE-r11.md` (frozen `5220f754`, before any session). Ours at `bbe8673c` (the redesign: names kept and explained, plain check only for a rewrite with a source, the request decides the shape, pre-edit search hook incl. Bash writes, eight always-on rules, scoped "none" lines, repository checks scoped to the session's files). 12 tasks of three NEW fresh writers (W10 maintenance X111-X114, W11 telling others X121-X124, W12 housekeeping X131-X133 and X134 by W12b after W12 stopped); 8 arms x 3 runs = 288 sessions, 0 limit or auth errors, 0 sessions set aside; five reason-first votes, 4 close splits (X112, X124) re-asked with seeds 6 and 7, 0 criteria with fewer than three valid votes. Scores: `SCORES.txt`.

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (12 tasks) | **41.33** | 32.67 | 28.33 | 26.67 | 30.67 | 35.33 | 33.00 | 34.67 | 48 |

Best other arm: gwc-invoked (35.33). Ours minus best other per paired (task, run) cell (36): mean +0.50, 95% interval [+0.14, +0.86]. **Pass rule I1: holds.** Descriptive, not gating: per writer ours 14.67 / 12.99 / 13.67 against the best other 12.00 / 11.00 / 14.33 (W12: dod is 0.66 above ours); ours is below the best other arm on X123 (3.33 against 4.00), X124 (level with base 2.33) and X134 (2.00 against dod 3.00); no task is more than 0.67 below base. Mean session cost 0.0926 USD against 0.0637 for base (1.45 times); the Stop hook blocked 6 of 36 ours sessions.

Limits: 12 tasks, 3 runs, one writer set; the same writers' tasks are read after this result and become development material. dod scores 0.00 on X121 and X123 (release notes, hand-off note); the cells are valid sessions, not errors. The gate says the product leads on tasks nobody on this project wrote; it is not the launch claim, which needs the sealed final.
