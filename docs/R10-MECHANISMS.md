# Round r10, Phase B design: mechanisms that do not depend on instruction sentences (written before the code)

Owner decision 2026-10-24. All four are general: no task, fixture, file name, number or criterion from any benchmark set appears in code or tests. Each is deterministic except B3, each is unit-tested with a mutation check, and the cost per cell is measured at the development check.

## B1 Verification loop (Stop hook, `bin/verify.mjs`, wired through `bin/claim-gate.mjs`)
Before the agent may finish, objective checks run against the repository and the transcript. Findings are returned as a block reason; the agent repairs and finishes. Up to two repair rounds per session (state file keyed by the session id under the temp directory; the existing `stop_hook_active` guard is not enough for two rounds). Fail-open on any error. `PRODUCT_ENGINEER_NO_GATE=1` turns everything off.
Checks (each only when the session wrote files in a git repository):
1. **Tests ran after the last source edit**, when the repository has a test command (package.json `scripts.test`, or `*.test.*`/`test_*.py` files with a known runner). Source written, no test command after it: finding with the command to run.
2. **Twins**: `twins` on the session's change (staged/working tree, or the last commit made in the session) finds near-copies of removed lines, and the session never ran `twins` or grepped the removed expression: finding with up to 5 `path:line`.
3. **Dangling names**: an identifier (option, flag, function, constant) removed or replaced by the change (present in removed lines, absent from added lines) is still referenced in a tracked file outside the change: finding with up to 5 `path:line`. Catches a half-done rename.
4. **Written notes**: if the session wrote a release-notes or changelog file whose first line names a range ("Changes since <ref>" or "<a>..<b>"), run `notes <file> --range` (cancelled work announced) and report disappeared names (`range` names-gone, at least two files had them) that the notes never mention.
Each finding names the exact command that settles it (B2).

## B2 Tool steering
Stop-hook claim families added to `claim-gate.mjs`: a count or range summary ("N commits", "all N", "since <tag> there were") and an exhaustiveness claim ("nothing else uses", "no other places", "only used in", "no remaining references") without a matching command in the session after the last edit (`range`, `facts`, `claims`, `twins`, `git grep`/`rg`/`grep -r`, `git rev-list --count`, `git log` with a range). The block reason names the tool to run. Also in the SessionStart brief (B4): one line listing the commands.

## B3 Second eye (`bin/second-eye.mjs`)
One cheap Haiku call (`claude -p --model claude-haiku-5-5`, child process with `PRODUCT_ENGINEER_NO_GATE=1`, no plugins, 45 s timeout, fail-open) that sees only the final answer, the list of commands the agent ran and the files it wrote, and answers one question: which factual claims in the answer are not supported by those commands? Reply is JSON `{unchecked:[{claim,why}]}` (max 5). Unchecked claims join the B1 findings (one block, one repair round for this source). `PRODUCT_ENGINEER_SECOND_EYE=0` disables; the binary is `$PE_SECOND_EYE_CLAUDE` or `claude`. Runs only when the answer is at least 200 characters and the session wrote files or ran git commands. Cost and latency are logged to a file under the temp directory for the cost-per-cell report.

## B4 Prepared context (`product-engineer brief`, SessionStart hook)
A compact brief (at most 1500 characters, deterministic, under 2 s): branch and state (staged/unstaged/untracked counts and names), the last 6 commits with class flags, latest tag and the commit count since it, branches not merged into the current one (name, commits ahead, last author), the detected test command, identifiers changed in the working tree, files touched by three or more of the last 20 commits, and the main authors of the changed files. Printed as SessionStart `additionalContext`. Silent outside a git repository.

## Cost rule
At most two blocks and one Haiku call per session. The development check reports sessions' cost for ours, base and the best rival; ours must stay within 1.5 times base per cell on average or the second eye is switched off by default before the gate.

## Tests and mutation
Every check has a positive and a negative test in a temporary git repository, a fail-open test, and a mutation check (break the check, see its test fail, restore).
