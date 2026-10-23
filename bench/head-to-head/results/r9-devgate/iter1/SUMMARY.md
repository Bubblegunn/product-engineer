# r9 development gate, iteration 1 (2026-10-23)

Protocol: `docs/DEV-GATE-r9.md` sections 1 to 7 (thresholds fixed before the runs). Ours at `b582ceb` (git archive copy), model `claude-sonnet-5-5`,
Claude Code 2.1.308, subscription path (`sub-shim`), work directory `/private/tmp/pe-r9-dev`, 3 runs per cell. 126 sessions, none failed, no limit or auth error.
Grading: 3 joint votes (seeds 1 to 3) on the six decision tasks; majority per criterion; outcome criteria only. Second order pass (reverse) was NOT run in this iteration.
Cost (CLI list-price estimate, not the subscription charge): sessions 8.33 USD, grading 3.25 USD.

Scoring: `node bench/head-to-head/dev-r9/devscore.mjs <work> tasks.json X94,X95,X97,X98,X99,X100` (output in `scores.json`).

| Task | max | ours | base | dod | dod-invoked | gwc | gwc-invoked |
|---|---|---|---|---|---|---|---|
| X94 | 4 | 2.67 | 2.33 | 3.00 | 4.00 | 3.00 | 4.00 |
| X95 | 4 | 4.00 | 3.00 | 3.00 | 2.67 | 3.00 | 2.33 |
| X97 | 4 | 3.33 | 3.00 | 2.33 | 2.33 | 2.67 | 1.67 |
| X98 | 4 | 3.00 | 2.67 | 2.67 | 2.33 | not run | not run |
| X99 | 4 | 2.67 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 |
| X100 | 4 | 3.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.67 |
| total (6 tasks) | 24 | 18.67 | 16.00 | 16.00 | 16.33 | 13.67 | 13.67 |

Best other arm by total: dod-invoked (16.33). Ours minus best other, mean per task-run cell (18 paired cells): +0.389, 95% bootstrap interval [-0.111, +0.833].
Gate checks: interval above 0: NO. Point estimate at least +0.5: NO. No task below base by more than 0.34: yes.
**Verdict: the development gate did not show a clear lead.** The final measurement is not started on this evidence.

Saturated and excluded (protocol section 7): X91, X92, X93 (no arm leaked a secret or a conflict marker into history, ours and base alike, 18 sessions; the
commit-guard hook never fired because the agent left the file out itself), X96 (both arms named the changed default). The hook's deny shape was not confirmed in a live client by these cells.

Why ours lost points (grader reasons, 3 of 3 votes): X94 criterion 4, a commit hash on the first line (our release-notes skill asks for the range with hashes; the task asks for none);
X94 run 2 criterion 2, churn about the re-applied feature written under "Not in this release"; X97 criterion 3 (page-size change hidden under a `chore:` title) missed in 2 of 3 runs;
X98 criterion 3 (tell the reviewer to look at the window change first) missed in 3 of 3; X99 criterion 3 (the reminder-time fix listed as not done) in 3 of 3, a fixture quirk the task author flagged;
X100 criterion 4 (new Node 20 requirement hidden in a `chore(deps)` commit) missed in 3 of 3 for every arm except gwc-invoked.

Deviations: first stage-1 cells were discarded because the work directory was below the home directory and the owner's global instruction file was loaded (see DEV-GATE-r9.md section 7);
`dod` runs used the prepared GNU tools via `arms.json` pathLinks as in earlier rounds; the objective greps in section 7 of the protocol were descriptive only.
