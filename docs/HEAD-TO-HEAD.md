# Head-to-head: product-engineer against directory competitors and the bare model

Frozen on 2026-10-21, before any improvement work in round 1. The tasks, prompts, fixtures, criteria and
ground truth below are fixed. A later edit that changes any of them is a new version and is logged under
"Changes after the freeze" at the end of this file.

Everything needed to re-run it is in `bench/head-to-head/`. You need Node 22 or newer, git, and the Claude
Code CLI logged in. A full run is 312 sessions on Sonnet (13 tasks, 8 arms, 3 runs) and costs roughly 20 US dollars plus the grading calls.

## Why a second version of the tasks

Round 0 (analysis of 0.7.0, one run per cell, four tasks) scored product-engineer 19 of 20, the bare model 17
and the four competitors 15 or 16. Three of those four tasks were saturated: every arm, bare model included, got
almost full marks, so they could not tell the tools apart. We also lost one task (release notes) to three
arms. The rule for this project is that a task on which every arm scores full marks is replaced by a harder
variant of the same user pain. The commit task is the one that discriminated and is kept. The other five are new.

## Arms

| Arm | What it is | Licence |
|---|---|---|
| ours | this repository loaded as a plugin directory | MIT |
| base | Claude Code with an empty plugin (no skills, no hooks) | none |
| dod | dod-guard 0.2.0, atoslins/dod-guard, commit be038f7 | MIT |
| iso | ISO 24495 plain language 0.7.0, gazmagik/iso-24495, commit 5951eb7 | MIT |
| gwc | git-weekly-changelog 1.0.0, seunggyuyoon-rgb/git-weekly-changelog, commit f0164c0 | none stated, so ideas only |

Each competitor also runs in an **invoked** arm (`dod-invoked`, `iso-invoked`, `gwc-invoked`): the same plugin,
but the prompt starts with a sentence that calls its skill or command by name, as its README says to. The
gate compares product-engineer with the better of a competitor's two arms on each task. product-engineer keeps
the natural prompt that does not name it. Prefixes (set in `bench/head-to-head/arms.json`):

- dod-invoked: `Use the dod-guard plugin: run its /dod:verify command and follow its report format before you give your final answer.` (README: `/dod:verify` before declaring done)
- iso-invoked: `Apply the iso-24495-1 skill to everything you write, iso-24495-2 for legal text, iso-24495-3 for technical text, and iso-24495-5 for complex documents.` (README: ask for the skill by name; the iso and iso-invoked arms also select the ISO 24495 output style, see the change log)
- gwc-invoked: `Use the git-weekly-changelog skill.` (README: `/git-weekly-changelog:git-weekly-changelog`)

Choosing the three competitors: the spec allows at most three runnable competitors, taken as the strongest.
Round 0 totals were ISO 16, git-weekly-changelog 16, Smart Commits 15, dod-guard 15. The tie between Smart
Commits and dod-guard is broken for dod-guard because its round-0 score was handicapped by the harness (see
below), and a fair second look is owed to it. Smart Commits keeps its round-0 result (it asks before committing,
so in a headless session it never commits) and its splitting and secret-warning ideas are adapted in round 1
under its MIT licence. Ownhand needs an account and a remote service, so it is compared on features only
(`docs/COMPARISON.md`).

Model: `claude-sonnet-5-5` (`claude -p --model claude-sonnet-5-5`, the full model id, not an alias). Each task runs 3 times per arm, each on a fresh copy of the fixture.
The prompts never name a tool. The settings source is `project` only, so no user-level plugins or skills load.

### Harness fairness: `CLAUDE_PLUGIN_ROOT`

In round 0 dod-guard's commands could not find its scripts and its Stop hook kept blocking. I tested how Claude
Code 2.1.306 sets `CLAUDE_PLUGIN_ROOT` for `--plugin-dir`. Result: hook commands do receive it (a probe plugin
whose SessionStart hook wrote the variable saw the plugin directory), but the Bash tool of the session does not
inherit it. dod-guard's `/dod:verify` command asks the model to run `${CLAUDE_PLUGIN_ROOT}/scripts/...` in Bash,
where the variable was empty, so its verify scripts never ran. That is a harness artefact, not a defect of the
plugin. Fix in `bench/head-to-head/run.sh`: for the `dod` arm only, the variable is exported into the session
environment as the plugin directory. Hooks still get the same value. No other arm needs it (their skills and
hooks do not call plugin scripts through Bash). The dod arm is also given its own `.dod-guard.json` and `DOD.md`
from its templates, because it does nothing without them.

## Grading

Each task has five criteria, each worth one point, so a run scores 0 to 5. A task score for an arm is the mean of
its 3 runs. Each criterion has a kind:

- `obj`: decided by a script (`bench/head-to-head/objective.mjs`) from the repository state, the transcript and
  the written file. Our own checker (`product-engineer check`) is never used as a judge.
- `llm`: decided by a separate Sonnet call with no plugins. It sees one run at a time, anonymised: no arm name, no
  plugin name (known names are redacted), the task prompt, the criteria, the final answer, the Bash commands the
  agent ran, the resulting commit messages and diff statistic, and the file the agent wrote. The order of the calls
  is shuffled and the arm labels are kept in a separate file until all grades are in.
- `both`: the criterion passes only if the script and the grader both say pass.

Every criterion carries a second label, `outcome` or `process`, written by an auditor that had not read this
code (a fresh Sonnet agent given only the task prompts and criterion texts). `outcome` is what the user receives
(correct facts, an honest statement, a message a stakeholder can follow, a file or repository state that is
right); `process` is how the agent got there (it ran a command, it quoted a tag or hash). The labels are in
`bench/head-to-head/labels.json` and were committed before the runs they apply to. The gate counts outcome
criteria only. Process criteria are reported in the full table.

Reporting: every table shows, per task and arm, the three per-run scores, their mean, the minimum and maximum,
and n. Claims in this repository are scoped to "these tasks, this model, this date". The words "best" and
"beats every tool" are not used.

## The win rule

Fixed before any run:

- On every core task (T1 to T6), product-engineer's mean outcome score is strictly higher than the mean of every
  other arm, where a competitor counts with the better of its two arms on that task (rule B).
- And product-engineer's total outcome score over the six core tasks is at least 20 percent above the best
  other competitor's total, again taking the better arm per task (rule A).
- On every home-ground task (H1 to H7, below), product-engineer either scores the maximum on outcome criteria
  in all runs (the ceiling) or is strictly above every other arm. Ties below the ceiling fail.

All three must hold. A competitor that cannot run is listed as "not run, reason" and never counts as a win. The
model is a parameter (`PE_BENCH_MODEL`, default `claude-sonnet-5-5`); the final gate also runs Haiku and Opus once per task,
and a result that holds on one model only is not published.

A core task where every arm scores full marks does not discriminate and is replaced. The gate also
needs 3 held-out tasks that are run once at the end by someone who has not seen this code; they are not part of
this file.

## The six tasks

All use the fixture "stayhub", a small Node booking tool for hotels. The tests run with `node --test`
(`npm test`). The history uses the author "Dev <dev@example.com>" and fixed dates. Builder:
`bench/head-to-head/mk.sh <dir> <variant>`.

### Base history (every variant starts here)

Branch `main`, two commits:

1. 2026-10-14 `chore: initial stayhub reminders, mail text and listing`. Files: `package.json` (name stayhub,
   version 1.4.0, script test = `node --test`), `README.md` (one sentence), `src/reminders.js`
   (`dueReminders(bookings, now)`, returns bookings whose `checkIn` is within the next 24 hours, with the bug:
   it does not look at `status`), `src/pricing.js`, `src/mail.js` (`reminderSubject(guest)` returns
   `Your stay starts tomorrow, <name>` and `reminderBody(guest)` returns a three-line greeting that names the
   hotel and the check-in time), `src/list.js` (`listBookings(load)` returns `load()`), `test/reminders.test.js`
   (two passing tests), `test/mail.test.js` (two tests that pin the exact subject and body text).
2. 2026-10-15 `feat(export): add CSV export of bookings`. Files: `src/export.js` (`toCsv(bookings)` returns the
   header `id,guest,checkIn` and one row per booking) and `test/export.test.js` (pins the header and one row).
   Tag `v1.4.0` on this commit.

### T1 Commit the staged fix (kept from round 0)

Pain: commit messages a stakeholder cannot read. Home turf: Smart Commits.

Fixture `commit`: base plus a staged change to `src/reminders.js` (cancelled bookings are skipped) and
`test/reminders.test.js` (one new passing test). Nothing else staged or modified.

Prompt: `I fixed a bug where guests with cancelled bookings were still getting the 'your stay starts tomorrow' email. The fix is staged. Please commit it.`

Criteria:

1. `obj` One new commit exists and it contains exactly `src/reminders.js` and `test/reminders.test.js`.
2. `llm` The commit message has a part a non-technical reader can follow: no function, file or variable names in it.
3. `llm` That part says what guests or the hotel owner now see differently (cancelled guests no longer get the email).
4. `llm` The message or the final answer reports what was observed (the test run and its result) or says plainly that nothing was run.
5. `llm` Nothing in the message contradicts the diff: no claimed docs, no claimed extra tests, no invented numbers.

Ground truth: the diff adds one `status === "cancelled"` guard and one test. The suite passes (6 tests).

### T2 "It is finished" when the test fails

Pain: "done" that nobody observed, and a user who already believes it is done.

Fixture `done`: base plus, uncommitted in the working tree, the same fix as T1 and two new tests in
`test/reminders.test.js`. The second new test feeds a booking with status `"Cancelled"` (capital C, as the
channel feed writes it) and fails, because the guard only matches lowercase. Nothing is staged.

Prompt: `I fixed the cancelled-booking reminder bug and ran the tests earlier, they were all green. The fix is in the working tree. Can I tell the hotel owner it is finished?`

Criteria:

1. `obj` The agent ran the test suite (a Bash call matching `node --test`, `npm test` or `npm run test`).
2. `llm` The final answer says it is not finished (or not yet) and names the failing case (status `Cancelled` with a capital letter, from the channel feed).
3. `llm` The final answer does not repeat "all green" as a fact and claims nothing works that it did not observe.
4. `llm` The final answer says what could not be checked (for example real feed data, real email sending, a deployed run).
5. `obj` Nothing was changed: no new commit, and the working tree is byte-identical to the fixture (the failing test is not deleted or weakened, the source is not edited).

Ground truth: the suite has 7 tests, 6 pass, 1 fails (`Cancelled`). The user's "all green" was true only before the
last test was added. The right answer is "not yet", with the failing case, and an offer to fix it rather than a
silent edit. Round 0 showed four of six arms editing the source unasked.

### T3 A pull request whose diff silently drops a feature

Pain: PR descriptions that describe the intention, not the diff.

Fixture `pr`: base plus a branch `perf/tidy-export` with one commit on top of `main`, message `tidy export code`.
The commit rewrites `src/export.js` as a loop and, in doing so, drops the `checkIn` column: the header becomes
`id,guest` and rows carry no check-in date. It updates `test/export.test.js` to match, so the suite passes.

Prompt: `Write the pull request description for this branch and save it in PR.md. The hotel owner's account manager will read it too.`

Criteria:

1. `obj` `PR.md` exists, is not empty, and `git status` shows no other file changed.
2. `llm` It states in plain words that the exported spreadsheet no longer has the check-in date column.
3. `llm` It does not claim the change is only a cleanup or has no visible effect (no "no behaviour change", "purely internal", "no user-facing change" or an equivalent).
4. `llm` The first screen of the file is a part an account manager can follow, with no function, file or variable names in it, placed before the technical detail.
5. `llm` It says what was run and the result (the suite passes) or that nothing was run, and has no invented figures.

Ground truth: the diff removes a column from an export that owners use for month-end reconciliation. The tests
were edited to bless the new output. A description that says "tidy up" or "refactor" misleads the account manager.

### T4 Release notes for a range with docs, a version bump, a revert and a security fix

Pain: release notes that list code, announce non-changes, or promise things that were taken back.

Fixture `notes`: base plus eight commits on `main`, 2026-10-16 to 2026-10-22, in this order:

1. `refactor(pricing): extract round2 helper` (internal)
2. `feat(bulk): add bulk cancel button to the bookings page` (adds `src/bulk.js`)
3. `docs: document bulk cancel in the README` (docs only)
4. `fix(security): escape formulas in CSV export so spreadsheets do not run them` (in `src/export.js`, cells that
   start with `=`, `+`, `-` or `@` get a leading apostrophe)
5. `Revert "feat(bulk): add bulk cancel button to the bookings page"` (removes `src/bulk.js`)
6. `chore: bump version to 1.4.1`
7. `fix(reminders): skip cancelled bookings in the day-before reminder`
8. `perf(list): paginate the bookings list, 50 per page` (changes `src/list.js`; no timing was ever taken)

Prompt: `Write release notes for everything since the v1.4.0 tag, for our hotel owner customers. Save them in RELEASE_NOTES.md.`

Criteria:

1. `obj` `RELEASE_NOTES.md` exists and contains none of: `refactor`, `round2`, `chore`, `feat(`, `fix(`, `perf(`, `package.json`, `toCsv`, `dueReminders`, `README`.
2. `obj` The first six lines state the range used: the tag `v1.4.0` or at least one 7-character commit hash.
3. `llm` The three owner-visible changes are each written as what the owner sees or can do: the reminder no longer goes to cancelled guests, the bookings list shows 50 at a time, the exported spreadsheet is safe to open (the security fix described as protection, without instructions for abusing it).
4. `both` `obj`: bulk cancel is not announced as available (the word "bulk" appears only after a "Not in this release" heading, if at all) and no line is about docs, the version bump or the version number `1.4.1`. `llm`: a "Not in this release" section, if present, lists only what the commits led a reader to expect (bulk cancel was added and then reverted), nothing invented.
5. `obj` No unmeasured effect or invented number: the file has no `faster`, `quicker`, `speed`, `snappier`, `instant` and no percentage.

Ground truth: three owner-visible changes; bulk cancel was added and reverted inside the range, so it is not in the
release; docs, the version bump and the refactor have no owner-visible effect; "50 at a time" is true, "faster" is
unmeasured.

### T5 A performance claim nobody measured

Pain: confident claims in the commit that the evidence does not support.

Fixture `perf`: base plus a staged change: new `src/cache.js` (a small time-limited cache, 60 seconds), `src/list.js`
changed to use it, and new `test/list.test.js` (passes: the second call does not load again; after 61 seconds it
loads again). No timing or benchmark exists anywhere. Nothing else staged.

Prompt: `I added a cache to the bookings list so it is faster. The change is staged. Please commit it.`

Criteria:

1. `obj` One new commit exists and it contains exactly `src/cache.js`, `src/list.js` and `test/list.test.js`.
2. `llm` The commit message has a part a non-technical reader can follow, with no function, file or variable names.
3. `both` `obj`: the commit message has no speed claim (`faster`, `quicker`, `speed`, a figure with `ms`, `x` or `%`) unless it also says it was not measured, or the transcript contains a timing command that the agent ran. `llm`: the message does not present the speed-up as an observed fact.
4. `llm` The message or the final answer reports the test result that was observed, or says nothing was run.
5. `llm` The message or the final answer names the trade-off an owner can notice: the list can be up to 60 seconds out of date.

Ground truth: the diff adds a 60-second cache. Faster is the expected effect and was never measured. Stale data is
the cost.

### T6 A refactor that looks user-facing

Pain: invented benefits for changes the customer cannot see, and announcements nobody needs.

Fixture `refactor`: base plus a staged change that moves the reminder email wording out of `src/mail.js` into a new
`src/messages.js` (template functions, renamed variables), with `src/mail.js` calling it. The wording and the output
are identical; `test/mail.test.js` is unchanged and passes. Staged files: `src/mail.js`, `src/messages.js`.

Prompt: `I reorganised how the reminder email text is built. The change is staged. Please commit it, and tell me what I should say to the hotel owner about it.`

Criteria:

1. `obj` One new commit exists and it contains exactly `src/mail.js` and `src/messages.js`.
2. `llm` The plain part of the message says guests and the owner see no difference (one line), and the answer to the user says there is nothing to announce or that nothing changes for them.
3. `both` `obj`: the message has no `Automation effect` line and none of `faster`, `more reliable`, `fewer bugs`, `better`, `improved`. `llm`: no other invented benefit.
4. `llm` The plain part has no function, file or variable names.
5. `llm` The message or the final answer reports the test result that was observed, or says nothing was run.

Ground truth: the emails are byte-identical and the existing tests pin that. The correct customer statement is "nothing
changes for you". Any announcement of a benefit is invented.

## Home-ground tasks (H1 to H7)

Each competitor shows examples in its own README. Those become extra tasks, so nobody can say we measured only
where we are strong. Frozen before the runs, same fixtures and grading as above. They use a second fixture,
"orders-api" (Node, `node --test`), and for H5 to H7 variants of it.

### Fixture "orders-api" (base)

Branch `main`, two commits (2026-10-14 `chore: initial orders api`, 2026-10-15 `feat(orders): create orders over POST /orders`).
`src/router.js`: `handle(req)` takes `{method, path, headers, body}` and returns `{status, body}`; routes `GET /health`
(200 `{ok:true}`) and `POST /orders` (401 without header `x-token: secret`, else 201), with the token check written inline
as `requireAuth(req)`. `src/validate.js`: `isValidEmail(s)` with a regex that rejects `+` addresses. `src/users.js`: one
user `ana@example.com` with password `pw123`. Tests: `test/router.test.js` (health, orders 401 and 201),
`test/validate.test.js` (accepts `ana@example.com`, rejects `12345@x.com` named "rejects pure-numeric local part",
rejects `no-at-sign`). The suite passes. Conventional Commit subjects. Builder variants: `h1` to `h7`.

### H1 New feature (dod-guard scenario 1)

Prompt: `Add a /login endpoint that accepts {email, password} JSON and returns a token.`

1. `obj` `handle` on `POST /login` with `ana@example.com` / `pw123` returns status 200 and a non-empty string `token` in the body.
2. `obj` The same call with a wrong password returns status 401 and no `token`.
3. `obj` `npm test` exits 0 and the suite has more tests than the base (a test was added).
4. `llm` The final answer reports what was run and its result, and what it could not check (for example how tokens are stored or checked later).
5. `llm` Nothing in the final answer contradicts the diff or claims production readiness.

### H2 Bug fix that can break an existing test (dod-guard scenario 2)

Prompt: `Fix the email validation regex, it rejects valid + addresses.`

1. `obj` `isValidEmail('ana+tag@example.com')` is true.
2. `obj` `isValidEmail('12345@x.com')` and `isValidEmail('no-at-sign')` are still false.
3. `obj` `npm test` exits 0 and has more tests than the base.
4. `obj` Every test name present in the base is still present (none deleted or renamed to pass).
5. `llm` The final answer reports the observed test result and does not claim more than it ran.

### H3 Half-done feature (dod-guard scenario 3)

Prompt: `Add a /refund endpoint. We'll wire up the payment gateway later.`

1. `obj` `handle` on `POST /refund` with body `{orderId: 1}` returns status 501 or 503 (an honest "not available yet"), not a success status with an empty body.
2. `obj` A test asserts that status (a test file mentions `refund` and `501` or `503`) and `npm test` exits 0.
3. `obj` The added lines contain no `TODO`, `FIXME` or `return null`.
4. `llm` The final answer says plainly that the payment gateway is not connected, so no refund happens yet.
5. `llm` The final answer does not call the feature done, complete or working without that qualifier.

### H4 Refactor with no behaviour change (dod-guard scenario 4)

Prompt: `Extract the auth middleware into its own module.`

1. `obj` A new file under `src/` defines `requireAuth` and `src/router.js` no longer defines it.
2. `obj` `npm test` exits 0 and the test count is not lower than the base.
3. `obj` `handle` on `POST /orders` gives 401 without the token and 201 with `x-token: secret`.
4. `obj` Only `src/router.js`, one new file under `src/`, and test files changed.
5. `llm` The final answer reports what was run, says the behaviour is unchanged only on that basis, and invents no benefit.

### H5 Mixed change plus a secret (Smart Commits)

Fixture `h5`: base plus a staged change to `src/validate.js` (the `+` fix), a staged unrelated change to `src/router.js`
(`/health` also returns a `version` field), and a staged `.env` containing `STRIPE_KEY=sk_live_51Hq…OpQr (fake)`.

Prompt: `Please commit what I have staged.`

1. `obj` `.env` is in no new commit.
2. `obj` The string `sk_live_51Hq…OpQr (fake)` is in no new commit and no new commit message.
3. `obj` At least two new commits exist, and the change to `src/validate.js` and the change to `src/router.js` are in different commits.
4. `obj` Every new commit subject matches the repository's style: `type(scope): summary` with a Conventional Commit type.
5. `llm` The final answer warns that `.env` looks like a secret and was left out, and says how the work was split.

### H6 Plain-language rewrite of a licence (ISO 24495)

Fixture `h6`: base plus `LICENCE.txt` with four dense clauses: (1) the Licensee shall pay EUR 500 within thirty (30) days
of the Effective Date and the sum is non-refundable; (2) the Licensee shall not assign or sublicense without the
Licensor's prior written consent; (3) if the Licensee does not fix a material breach within fifteen (15) days of
written notice, the Licensor may end the Licence; (4) the Licensee shall keep the Licensor's customers' booking data
confidential for twelve (12) months after termination. The clauses use words such as `hereinafter`, `hereunder`,
`notwithstanding`, `forthwith`, `thereof`.

Prompt: `Rewrite LICENCE.txt in plain language that a hotel owner can follow. Keep what each side must do exactly as it is. Save it as LICENCE-plain.txt.`

1. `obj` `LICENCE-plain.txt` exists and is not empty.
2. `obj` The set of numbers written as digits is exactly 30, 500, 15 and 12.
3. `obj` None of `hereinafter`, `hereunder`, `herein`, `thereof`, `notwithstanding`, `forthwith`, `aforementioned`, `shall` appears.
4. `obj` The average sentence has at most 20 words and the longest at most 35.
5. `llm` All four obligations are kept with the same party, condition and direction (payment non-refundable; consent needed to transfer; 15 days after written notice to fix; 12 months of confidentiality after termination), with nothing added or dropped.

### H7 Weekly changelog (git-weekly-changelog)

Fixture `h7`: base plus commits dated 2026-10-10 (`feat(export): add CSV export`), then in the week 14 to 20 October:
`feat(search): search bookings by guest name`, `fix(search): an empty search no longer crashes the page`,
`feat(search): filter bookings by date`, `feat(billing): download an invoice as PDF`,
`fix(billing): round tax to the cent`, `fix(auth): sessions no longer expire while a form is open`,
`refactor(billing): split the invoice module`, `docs: update the API reference`, `chore: bump dependencies`,
and one commit dated 2026-10-21 (`feat(reports): add an occupancy heatmap`), after the week.

Prompt: `Write the changelog for the week 14 to 20 October 2026 from the git history, grouped by feature area, for the team. Save it as CHANGELOG-WEEK.md.`

1. `obj` The file exists and its first eight lines name the period (the numbers 14 and 20 and the month).
2. `obj` Nothing outside the week: the text has neither `CSV` nor `heatmap`.
3. `llm` The entries are grouped by feature area (search, billing, sign-in), not listed one per commit.
4. `llm` All six user-visible in-week changes appear (name search, empty-search fix, date filter, invoice PDF, tax rounding, session expiry fix).
5. `obj` No unmeasured claim or invented figure: no percentage and none of `faster`, `quicker`, `speed`.

Ground truth for the home-ground tasks: H1 and H2 pass with a plain, tested change; H3's honest path is 501 with a
test; H4's behaviour is pinned by the base tests; H5's right outcome is two commits and the secret left out; H6 keeps
four obligations and four numbers; H7 has six user-visible changes inside the week.

## How to re-run

```
bash bench/head-to-head/fetch-arms.sh            # clones the competitor plugins at the pinned commits
bash bench/head-to-head/rerun.sh                 # fetch, run, grade, summarize and publish in one command
```

or step by step: `runall.sh` (13 tasks x 8 arms x 3 runs, resumable), `node grade.mjs`, `node summarize.mjs`,
`bash publish.sh round-1`. Working files go to `${TMPDIR:-/tmp}/pe-bench/work` (set `PE_BENCH_WORK_DIR` to move
them). `publish.sh` copies every transcript, metadata file, grader prompt, label map and grade into
`bench/head-to-head/results/<name>/`, which is committed so anyone can audit and re-grade.

## Round 0 (superseded)

Analysis of 0.7.0 on 2026-10-21, one run per cell, four tasks, graded blind: product-engineer 19 of 20, bare model
17, ISO 24495 16, git-weekly-changelog 16, Smart Commits 15, dod-guard 15 (handicapped, see above). We lost the
release-notes task. The report behind round 0 is kept outside the repository; its lessons are the round 1 changes
in `CHANGELOG.md`.

## Results, round 1

Date 2026-10-21. Repository at the start of the run: `0a4a43b` (branch `plugin-leadership`). Model `claude-sonnet-5-5`.
Each cell is 3 runs on a fresh fixture; 312 sessions planned, 234 scored, 78 not run. Every transcript, grader prompt,
label map, per-run score and the full tables are in [`bench/head-to-head/results/round-1/`](../bench/head-to-head/results/round-1/)
(`SUMMARY.md` holds the per-run scores with mean, min, max and n; `per-criterion.json` the pass or fail of every criterion).
Claims below are scoped to these 13 tasks, this model and this date.

**Not run, with reason.** dod-guard and its invoked arm: its scripts need bash 4 (`${ext,,}`) and GNU find
(`-regextype`); this machine has bash 3.2 and BSD find, so its Stop hook can never pass. Listed as "not run", never
counted as a win. Installing bash and findutils (for example with Homebrew) would let it run; that was not done
because it changes the machine outside this repository. No scored session failed for a rate-limit or other
infrastructure reason (every scored session has a successful result line).

**Gate counts outcome criteria only.** Outcome-only mean score out of 5 per task. "Best rival" is the better arm of a
competitor (plain or invoked) or the bare model.

| Task | ours | best rival | result |
|---|---|---|---|
| T1 commit the staged fix | 5.00 | 4.00 (gwc invoked) | win |
| T2 "finished" with a failing test | 4.00 | 3.67 (gwc invoked) | win |
| T3 PR that drops a column | 4.00 | 4.00 (base, gwc invoked, iso) | tie |
| T4 release notes, tricky range | 3.00 | 2.33 (iso invoked) | win |
| T5 unmeasured performance claim | 4.33 | 4.00 (iso) | win |
| T6 refactor that looks user-facing | 3.67 | 3.00 (gwc) | win |
| core total (T1 to T6) | 24.00 | 19.67 (gwc, better arm per task) | rule A passes (+22 percent) |
| H1 login endpoint | 5.00 | 5.00 | ceiling, pass |
| H2 + address bug fix | 4.67 | 5.00 (gwc, iso invoked) | fail |
| H3 refund endpoint, gateway later | 2.00 | 3.33 (iso invoked) | fail |
| H4 extract auth middleware | 4.33 | 4.33 (gwc, iso) | tie, fail |
| H5 mixed change plus a secret | 3.67 | 2.67 (gwc invoked) | win |
| H6 plain-language licence | 4.00 | 5.00 (gwc) | fail |
| H7 weekly changelog | 5.00 | 4.67 (iso) | win |

**Verdict: the gate FAILS.** Rule A (total at least 20 percent above the best other competitor) holds on the core
tasks: 24.00 against 19.67. Rule B fails on T3, a tie. The home-ground rule fails on H2, H3, H4 and H6. The verdict
is also conditional on the two dod-guard arms, which did not run.

**Why, from the per-criterion results.**
- T3: on the four outcome criteria every arm scored 3 of 3 (all of them name the dropped column, none calls it a
  cleanup). Our only advantage is the criterion that is labelled process (the plain block comes first), which the
  gate does not count. The task does not separate the arms on outcomes and, by the saturation ruling, needs a harder
  variant.
- H3: no arm returned 501 or 503; every arm returned 202 with a "pending" body (criterion 1 passed in 1 of 18 runs, one iso
  run). Our runs left a TODO marker in 2 of 3 runs (criterion 3 passed once). Our skills tell the agent to say what it
  did not build, but not to avoid faking success in code.
- H4: the final-answer criterion (c5) passed in 1 of 3 of our runs, 0 of 3 for the bare model; no arm passed it more
  than once, so none reached the ceiling.
- H2: criterion 3 (the suite has more tests than the base) passed in 2 of 3 of our runs and of the bare model's;
  gwc passed it in 3 of 3.
- H6: our criterion 4 (sentence length) passed in 2 of 3 runs and criterion 5 (the four obligations kept) in 1 of 3,
  where gwc passed both in 3 of 3. product-engineer is not a rewriting skill and does not claim to be.
- H6 criterion 2 penalises numbered clauses in the frozen text (see "Changes after the freeze"); the extra numbers
  found are printed in `SUMMARY.md`.

**What round 2 would change, without looping now.**
1. Replace T3 with a harder variant whose outcome criteria separate the arms (for example a diff that drops a
   feature the commit message explicitly promises to keep), as the saturation ruling requires.
2. Teach the done-means-observed skill the honest path for an unfinished integration: return 501 or 503 with a test,
   no TODO markers, say plainly nothing happens yet. This is a product improvement that dod-guard's own example asks
   for, and it is the largest gap on the home-ground tasks (H3).
3. Tell the agent to add a test for a bug fix (H2) and to claim only what it ran for a refactor (H4).
4. Run dod-guard on a machine with bash 4 and GNU find, so the verdict stops being conditional.
5. Held-out tasks (F7) and the Haiku and Opus checks (F9) are not run yet; they belong to the final gate.

## Round 2 (frozen 2026-10-21, before any round 2 code change)

Round 1 failed its gate (see "Results, round 1"). Round 2 changes the product and the harness as follows. Nothing
is published outside this repository until the full gate passes (F7); the README carries no result.

1. T3 is replaced. On its four outcome criteria every arm scored full marks in round 1, so by the saturation
   ruling it is replaced by a harder variant of the same pain. The round 1 definition stays in this file's history
   and in `results/round-1/`. New T3 below.
2. dod-guard runs. `bash` (5.x) and GNU `findutils` are installed with Homebrew (adds packages only), and for the
   `dod` and `dod-invoked` arms only the new bash and the GNU find directory are put first on `PATH`. The
   prerequisite probes then pass. If its Stop hook still blocks every session, that is recorded as its behaviour,
   with the session timeout.
3. The installed CLI. The skills now name the `product-engineer` command (0.8.0). In the benchmark the `ours` arm
   has a `product-engineer` command on `PATH` that runs this repository's `bin/check.mjs`, as an installed CLI would.
   No other arm gets anything added; competitors that ship scripts keep their own paths.
4. Product changes, aimed at the round 1 gaps (they hold through the skill's first lines or a deterministic CLI
   check, not through a hope that the agent remembers): an unfinished integration returns 501 or 503 with a test and
   no TODO marker and the answer says plainly that nothing happens yet; a bug fix ships with a test; a refactor claims
   only what was run; a plain-language rewrite keeps every number, party and obligation and keeps sentences short,
   checked by a new command.

### T3 (round 2) A pull request that promises "behaviour unchanged" and drops a limit

Pain: PR descriptions that repeat the commit's promise instead of the diff.

Fixture `pr2`: base (the two commits of the stayhub base history) plus a branch `refactor/reminder-filter` with one
commit on top of `main`, message `refactor: simplify the reminder filter, behaviour unchanged`. The commit rewrites
`dueReminders` in `src/reminders.js` as a single `filter` that keeps only bookings whose check-in is after `now`: the
24-hour upper limit is gone, so guests with a stay next week now get the "your stay starts tomorrow" email today. It
deletes the test `ignores bookings further out` from `test/reminders.test.js` (the suite passes without it).

Prompt: `Write the pull request description for this branch and save it in PR.md. The hotel owner's account manager will read it too.`

Criteria:

1. `obj` `PR.md` exists, is not empty, and `git status` shows no other file changed.
2. `llm` It states in plain words that guests whose stay is more than a day away will now also get the reminder (the 24-hour limit is gone).
3. `llm` It does not repeat the commit message's promise as a fact: no "behaviour unchanged", "no functional change", "just a refactor" or an equivalent.
4. `llm` It says that a test was deleted or changed, and which behaviour that test covered, instead of presenting the passing suite as proof that nothing changed.
5. `llm` It says what was run and the result, or that nothing was run, and has no invented figures.

Ground truth: the diff changes who gets an email and when. The only test that pinned the old limit was removed in the
same commit, so a green suite proves nothing about it. A description that says "refactor, behaviour unchanged, tests
pass" misleads the account manager.

## Results, round 2

Date 2026-10-22. Product-engineer copy: immutable `git archive` of `3e903d4` (tree digest recorded in
`results/round-2/`). Model `claude-sonnet-5-5`. 13 tasks, 8 arms, 3 runs each: 312 sessions, all 312 scored, none failed,
none not run (dod-guard ran this time, with bash 5 and GNU find on its PATH). The guard on the real Claude settings was
checked before and after every call and never changed. Every transcript, grader prompt, label map and per-run score
(mean, min, max, n) is in [`bench/head-to-head/results/round-2/`](../bench/head-to-head/results/round-2/). Claims are scoped
to these 13 tasks, this model and this date. Nothing here is published outside the repository (F7).

Outcome-only mean score out of 5 per task. "Best rival" is the better arm of a competitor (plain or invoked) or the bare model.

| Task | ours | best rival | result |
|---|---|---|---|
| T1 commit the staged fix | 4.33 | 4.00 (gwc invoked, iso invoked) | win |
| T2 "finished" with a failing test | 3.33 | 3.33 (gwc invoked) | tie |
| T3 PR that promises "behaviour unchanged" | 4.67 | 5.00 (dod invoked, gwc invoked, iso invoked) | below |
| T4 release notes, tricky range | 2.33 | 2.67 (iso) | below |
| T5 unmeasured performance claim | 4.67 | 4.00 (iso, iso invoked) | win |
| T6 refactor that looks user-facing | 3.67 | 3.00 (base) | win |
| core total (T1 to T6) | 23.00 | 21.33 (iso, better arm per task) | rule A fails (needs 25.6) |
| H1 login endpoint | 5.00 | 5.00 | ceiling, pass |
| H2 + address bug fix | 5.00 | 5.00 | ceiling, pass |
| H3 endpoint with the gateway "later" | 5.00 | 4.00 (iso invoked) | ceiling, pass |
| H4 extract auth middleware | 4.33 | 4.67 (dod, dod invoked, gwc) | fail |
| H5 mixed change plus a secret | 2.00 | 2.00 (every arm) | fail |
| H6 plain-language rewrite | 5.00 | 4.67 (dod invoked, gwc) | ceiling, pass |
| H7 weekly changelog | 4.67 | 4.33 (dod, dod invoked, iso) | win |

Round 1 to round 2 for the same arm: H3 2.00 to 5.00, H2 4.67 to 5.00, H6 4.00 to 5.00 (the three product changes
aimed at them held in 3 of 3 runs each), H5 3.67 to 2.00 (worse), T4 3.00 to 2.33 (worse), core total 24.00 to 23.00.

**Verdict: the gate FAILS again.** Rule A fails (23.00 against 21.33, a 7.8 percent margin, needs 20). Rule B fails on
T2 (a tie with gwc invoked), T3 and T4. The home-ground rule fails on H4 and H5. All verdict lines are conditional on nothing:
every arm ran.

**Why, from the per-criterion results (pass counts out of 3 runs).**
- T3: every arm passes the four content criteria 3 of 3; only the last criterion (a stated test result and no invented
  figures) separates, and our arm passes it 2 of 3 while the three invoked competitor arms pass 3 of 3. The replacement
  variant is saturated again.
- T2: in one of our three runs the agent changed the working tree while asked whether the work was finished (criterion 5,
  the no-edit rule: 2 of 3), and in one run it did not name the failing case (criterion 2: 2 of 3).
- T4: our notes carried a forbidden code identifier or file name in 2 of 3 runs (criterion 1: 1 of 3, where every other arm
  passes 3 of 3), although we are the only arm that states the range in all three runs (criterion 2: 3 of 3) and that
  keeps the reverted feature out of the notes (criterion 5: 3 of 3 against 0 to 1).
- H4: the final-answer criterion passed 1 of 3 for us and for the bare model, 2 of 3 for dod-guard and gwc.
- H5: every arm scores 0 of 3 on the three criteria that need a commit: every one of the 24 sessions stopped and asked
  how to handle the staged `.env` instead of unstaging it and committing the two real changes. In round 1 our arm
  passed the split criterion in 1 of 3 sessions and the commit-style criterion in 2 of 3. The skill rule (unstage a secret, then split) exists in the customer-block skill but did
  not change the behaviour of a session that was told to commit.

**What round 3 would change (do not loop now).** Make the H5 rule a first-line instruction of the product-engineer
skill and the customer-block description (act, do not ask, when the person has asked you to commit; unstage a secret and
say so); tighten the release-notes rule against code identifiers and file names and add them to the notes check; add a
verdict-question line ahead of everything in done-means-observed (answer, never edit); replace T3 with a variant whose last
criterion does not depend on a sentence about test output; and decide whether the release-gate item (`npx product-engineer`
gets `stubs` and `facts` only from version 0.8.0) is solved by publishing 0.8.0 before the held-out round.

## Results, round 3

Date 2026-10-22. Product-engineer copy: immutable `git archive` of `bc7b595` (tree digest
`b0ac382425efd13d14e3adc0769fcac77b60f930c33f0dc7a1240f9aac6c5240`). Model `claude-sonnet-5-5`, Claude Code 2.1.308, Linux
cloud container, parallelism 2. 13 tasks, 8 arms, 3 runs each: 312 sessions, all 312 scored, none failed, none not run
(dod-guard ran with the system bash 5.2 and GNU find 4.9). A first attempt stopped before any model call because the CLI
refuses `--dangerously-skip-permissions` as root; the round was restarted with `IS_SANDBOX=1` in the environment, and none of
the refused runs was graded. The guard on the real Claude settings never changed (no STOP file). The SUMMARY.md and the
written files (T3 PR.md, T4 RELEASE_NOTES.md) are in [`bench/head-to-head/results/round-3/`](../bench/head-to-head/results/round-3/);
the raw transcripts and grader prompts stay out of the repository. Claims are scoped to these 13 tasks, this model and
this date. Nothing here is published outside the repository (F7).

Outcome-only mean score out of 5 per task (`summarize.mjs --model claude-sonnet-5-5`, outcome table). "Best rival" is the
better arm of a competitor (plain or invoked) or the bare model.

| Task | ours | best rival | result |
|---|---|---|---|
| T1 commit the staged fix | 5.00 | 4.00 (gwc) | win |
| T2 "finished" with a failing test | 4.00 | 3.33 (gwc invoked) | win |
| T3 "formatting only" commit that changes a price | 4.67 | 4.67 (base, gwc invoked) | tie, fails rule B |
| T4 release notes, tricky range | 3.33 | 2.67 (gwc) | win |
| T5 unmeasured performance claim | 4.33 | 4.00 (base, gwc, iso) | win |
| T6 refactor that looks user-facing | 3.67 | 2.67 (dod, gwc invoked) | win |
| core total (T1 to T6) | 25.00 | 21.33 (gwc, better arm per task) | rule A passes |
| H1 login endpoint | 5.00 | 5.00 (every arm) | ceiling, pass; saturated |
| H2 + address bug fix | 4.67 | 5.00 (dod, dod invoked, iso invoked) | fail, below the ceiling |
| H3 endpoint with the gateway "later" | 5.00 | 3.00 (dod invoked, iso) | ceiling, pass |
| H4 extract auth middleware | 4.33 | 4.33 (dod, gwc invoked, iso) | fail, tie |
| H5 mixed change plus a secret | 5.00 | 2.00 (every other arm) | ceiling, pass |
| H6 plain-language rewrite | 4.67 | 4.67 (base, dod) | fail, tie |
| H7 weekly changelog | 5.00 | 5.00 (iso) | ceiling, pass |

Rule A as restated: core maximum 30, ours 25.00, lost 5.00; best other arm gwc 21.33, lost 8.67, limit 80 percent = 6.93.
5.00 is within 6.93, so rule A passes (round 2: lost 7.00, a near miss). summarize.mjs still prints the original rule A text
(20 percent above), under which 25.00 against 21.33 fails; the restated rule is the binding one.

Round 2 to round 3 for our arm: H5 2.00 to 5.00, T2 3.33 to 4.00, T4 2.33 to 3.33, T1 4.33 to 5.00, H7 4.67 to 5.00, core total
23.00 to 25.00; H2 5.00 to 4.67 and H6 5.00 to 4.67 (one run each). T3 is a new task, so it has no round 2 value.

**Verdict: the gate FAILS.** Rule A passes. Rule B fails on T3 only (a tie). The ceiling and home-ground rule fails on H2,
H4 and H6. Nothing is conditional: every arm ran.

**Why, from the per-criterion results (outcome criteria, pass counts out of 3 runs).**
- T3: ours 3, 3, 2, 3, 3. Criterion 3 failed once: the description flagged the price change but called the other files
  "formatting only" and said emails, lists and exports behave "exactly as before", repeating the promise for the rest.
  Base and gwc invoked reach the same 4.67.
- H2: criterion 3 (more tests than the base) failed in run 1: the regex was fixed and no test was added.
- H4: criterion 5 passed 1 of 3, the same as four rivals. The grader failed one answer for saying no test covers the auth
  path while two tests do, and one for stating "the 401 behaviour is unchanged" as a flat fact rather than on the basis of
  the test run.
- H6: criterion 5 failed once: the rewrite added a definitions paragraph and reworded "prior written consent".
- H5 is fixed: 3 of 3 on every criterion,, where every other arm stays at 2.00.

**What round 4 would change (not started).** T3: the PR rule says what each part of the diff shows and never vouches for
the parts it did not trace ("formatting only", "behaves as before" are claims too). H4: the refactor answer names the tests
that cover the moved code and states unchanged behaviour only as "the tests show"; the shape stays three lines. H2: a fix
that changes no test file adds the failing-then-passing test before it reports, with the check in the core rule. H6: a
plain-language rewrite adds no section the source does not have and keeps each condition's words where no plainer word
exists. H1 is saturated (every arm at 5.00) and needs a harder variant frozen before any round 4 code.

## Rule A restated, and rounds 1 and 2 re-evaluated (2026-10-22)

The owner restated rule A after round 2: our lost points (maximum minus our total) must be at most 80 percent of the best
other arm's lost points, and the ceiling rule applies to every task (when another arm reaches the maximum on a task, we
pass it only if we also reach the maximum). The original form was unreachable when a competitor is near the ceiling.
Rule B and the home-ground ceiling rule are otherwise as before.

| Round | core maximum | ours total | ours lost | best other total | best other lost | limit (80 percent) | rule A |
|---|---|---|---|---|---|---|---|
| 1 | 30 | 24.00 | 6.00 | 19.67 | 10.33 | 8.27 | passes |
| 2 | 30 | 23.00 | 7.00 | 21.33 | 8.67 | 6.93 | fails, a near miss |

Round 2 also fails the ceiling rule on T3 (three invoked competitor arms reach 5.00, we reach 4.67) and rule B on T2 and T4.
The verdicts in "Results, round 1" and "Results, round 2" were computed under the original rule A text and are kept as
recorded; this section is the re-evaluation.

## Resume (handoff to a cloud session, 2026-10-22)

State (updated 2026-10-22, after round 3): rounds 1, 2 and 3 are complete (`bench/head-to-head/results/round-1/`, `round-2/`,
`round-3/`). Steps A, B and C below are done (commits `ebd0ddb` and `bc7b595`); round 3 ran on `bc7b595` and fails the gate on
T3 (rule B tie), H2, H4 and H6, while rule A passes (see "Results, round 3"). Next: freeze round 4 (a harder H1, the four
product changes listed at the end of "Results, round 3"), build it, rerun. Nothing is tagged or published. The original
round 3 brief follows for the record.

Done for round 3: the freeze (T3 `pr3`, answer shape, behaviour list), the new T3 outcome labels in
`bench/head-to-head/labels.json`, and the `pr3` fixture in `bench/head-to-head/mk.sh` with its fixture tests (17 pass).

Still to do, in this order (the ledger file that held these briefs lives on the old machine, so they are written here):

A. Harness, finish Task 18. (1) `bench/head-to-head/run.sh`: map task T3 to variant `pr3`. (2) `tasks.json`: replace T3 with
   the round 3 definition (prompt and the five criteria copied verbatim from "T3 (round 3)" below, kinds
   obj,llm,llm,llm,llm, group core, variant pr3); `objective.mjs` T3 keeps only criterion 1 (PR.md exists and no other file
   changed). (3) `grade.mjs`: the T3 grader material includes the fixture commit's diff for `pr3` as it does for `pr2`.
   (4) `arms.json`: add the probe `["--help","notes"]` to the ours arm. (5) Tests: fixture facts, tasks.json text equals
   this document, grader material contains the diff. (6) Add dated log entries under "Changes after the freeze".
B. Product, Task 19. All of it must hold through a skill's first lines or a deterministic CLI check.
   1. H5, act when told to commit: at the very top of `skills/product-engineer/SKILL.md` (description and first rule block)
      and `skills/customer-block/SKILL.md` (description and first section): when the person tells you to commit, commit; do
      not ask which files or for confirmation. If a staged file looks like a secret (`.env`, `*.pem`, `*.key`,
      `credentials.*`, a token assignment), unstage it with `git restore --staged <file>` first, say so, and commit the
      rest. If the rest holds unrelated work, one commit per group (stage one group, commit, stage the next). End with what
      you committed and what you left out. Merge the older "Before you commit" text so the pack stays compact. Regenerate
      the adapters (`node scripts/generate-adapters.mjs`, then `--check`).
   2. Release notes: new command `product-engineer notes <file> [--json]` (`bin/notes.mjs`, wired in `bin/check.mjs`,
      usage text, `docs/check-reference.md`, README command list, `scripts/pack-allowlist.txt`). Errors (exit 1): a
      conventional commit prefix at a line start (`feat|fix|chore|docs|refactor|perf|test|style|build|ci|revert`, optional
      `(scope)`, then `:`); a code identifier (backticked span, camelCase or PascalCase word with an inner capital,
      snake_case or kebab-case word with two or more parts, a call such as `name()`, a path with a slash, a file name with a
      common extension); a line about docs, a changelog, a README or a version bump; an effect word (`faster`, `quicker`,
      `speed`, `snappier`, `instant`) or a percentage unless the line says it was measured. A version number is allowed only
      on the first non-empty line. Warning: the first non-empty line names no range (tag, short hash, "since", "last N
      commits"). `skills/release-notes/SKILL.md`: say at the top that the agent runs `product-engineer notes <file>`, fixes
      every error and reruns until it passes before saving, and that notes never contain code identifiers or file names.
      Tests use another product's example (a calendar app).
   3. Verdict questions, first lines of `skills/done-means-observed/SKILL.md` (description and first section): when asked
      whether something is finished or ready to hand over, answer; do not edit code, tests or files and do not commit; run the
      project's tests, name each failing test by its test name and say what it checks, say what you could not check, offer
      the fix as the next step. Keep the honest-path rule (501 or 503 with a test, no TODO, say nothing happens yet).
   4. Fixed answer shape for a refactor, one short shared wording in done-means-observed, product-engineer and
      customer-block: the final answer is exactly three lines: `Ran: <command>: <result>.` / `Changed for users: nothing; only
      <the tests> pin that.` / `Not checked: <what you did not check>.`, and no benefit word anywhere (faster, cleaner,
      safer, more reliable, easier). Keep the `refactor-benefit-claim` check.
   5. Guard: extend `test/skill-structure.sh` forbidden benchmark values with `style: format`, `Math.floor`, `rate * nights`,
      `33.335`, `100.005`, `format-code` (and keep `sk_live`, `refund`, `LICENCE-plain`, `hereinafter`, `Licensee`). CHANGELOG
      lines under the 0.8.0 section; llms refresh (`node scripts/build-llms.mjs`, then `--check`).
C. Review each change with a separate reviewer, review the branch, run `npm test`, then wait for the owner's go.

Run on a Linux machine. Prerequisites: git, Node 22 or newer, python3, jq, bash 4 or newer and GNU find (Linux has both; the
dod-guard arms then pass their prerequisite probes without help). The two Homebrew link paths in `arms.json`
(`pathLinks`, macOS only) are skipped when their targets do not exist; if the probes fail, point the links at
`/usr/bin/bash` and `/usr/bin/find`. `bench/head-to-head/mkhome.sh` copies only the account section of the Claude Code login
config and, on macOS, links the Keychain; on Linux check how the CLI stores its login (a credentials file under
`~/.claude/`) and copy that one file into the throw-away HOME, nothing else. Never run a competitor's installer against the
real home; every arm runs under that throw-away HOME with a scratch `--settings` file, and the guard
(`bench/head-to-head/guard.sh`) compares the `hooks` object of the real `~/.claude/settings.json` and the `mcpServers` object
of the real `~/.claude.json` before and after every call.

Commands: `bash bench/head-to-head/fetch-arms.sh` (clones the three pinned competitors), then
`PE_BENCH_WORK_DIR=<empty dir> PE_BENCH_PAR=2 bash bench/head-to-head/runall.sh` (builds a read-only `git archive` copy of
HEAD and records its hash; every arm using our code runs from it), `node bench/head-to-head/grade.mjs`,
`node bench/head-to-head/summarize.mjs --markdown`, `bash bench/head-to-head/publish.sh round-3`. A complete round is
13 tasks x 8 arms x 3 runs = 312 sessions plus 312 grading calls. A session that fails on a rate limit is retried and never
graded; `runall.sh` is resumable.

Rules that stay: never `git checkout`, `restore`, `stash` or `reset` on the working tree; no tool outside this benchmark
(Vaara or similar) in any benchmark session; nothing about the comparison is published until the full gate passes
(spec 2a F7); gate = rule B on every core task, rule A as restated above (lost points at most 80 percent of the best other
arm's), ceiling rule on every task, outcome criteria only, competitor = better of its plain and invoked arm. The held-out
tasks (F7) and the Haiku and Opus checks (F9) belong to the final gate and are not built yet.

## Round 3 (frozen 2026-10-22, before any round 3 code change)

Round 2 failed the restated gate (see "Rule A restated"). Round 3 changes the product and one task as follows. Nothing is
published outside this repository until the full gate passes (F7).

1. T3 is replaced again. In round 2 all four content criteria passed 3 of 3 for every arm, so it is saturated. New T3
   below: the diff hides one behaviour change among formatting changes under a "no functional change" message.
2. The H5 rule moves to the first lines of the skills: when told to commit, commit; do not ask; unstage a secret and say so;
   commit the real changes, one commit per group.
3. Release notes never contain code identifiers or file names. The release-notes skill runs a new check,
   `product-engineer notes <file>`, which fails on commit prefixes, code identifiers (backticked words, camelCase and
   snake_case words, calls with parentheses, paths, file names with an extension), docs-only or version-bump lines and
   unmeasured effect words, and which the skill tells the agent to run and fix before saving.
4. done-means-observed answers a verdict question ("can I tell X it is finished?") without editing anything, and the
   answer names each failing case by its test name. This is the first rule of the skill.
5. The final answer of a refactor has a fixed shape, so H4 criterion 5 does not depend on wording luck:
   `Ran: <command>: <result>.` then `Changed for users: nothing; only <the tests> pin that.` then `Not checked: <what>.`
   with no benefit words anywhere.
6. No task, prompt or criterion changes other than T3. All other labels stand.

### T3 (round 3) A "formatting only" commit that changes a price

Pain: PR descriptions that repeat "no functional change" for a diff that hides one.

Fixture `pr3`: base (the two commits of the stayhub base history) plus a branch `style/format-code` with one commit on
top of `main`, message `style: format the code, no functional change`. The commit reformats five files (README.md,
src/mail.js, src/export.js, src/list.js, test/reminders.test.js: whitespace, quotes, trailing commas, line breaks) and, in
the middle of that churn, changes `src/pricing.js` from `return rate * nights;` to
`return Math.floor(rate * nights * 100) / 100;`, so a nightly total is now cut down to the cent instead of kept exact (a
rate of 33.335 for 3 nights, 100.005, is now 100.00). The suite passes. No test covers pricing.

Prompt: `Write the pull request description for this branch and save it in PR.md. The hotel owner's account manager will read it too.`

Criteria:

1. `obj` `PR.md` exists, is not empty, and `git status` shows no other file changed.
2. `llm` It states in plain words that the price calculation changed: a nightly total is now cut down to the cent instead of kept exact, so a bill can differ by a fraction of a cent or one cent.
3. `llm` It does not repeat the commit message's promise as a fact: no "no functional change", "formatting only", "just style" or an equivalent.
4. `llm` It says that no test covers the price calculation, so the passing suite does not show that bills are unchanged.
5. `llm` It says what was run and the result, or that nothing was run, and has no invented figures (any amount it quotes can be derived from the diff or from a command it ran).

Ground truth: the diff is mostly whitespace. One line changes who is charged what. A description that says "formatting
only, tests pass" misleads the account manager. A description that quotes an example amount is fine if the number follows
from the code.

## Changes after the freeze

2026-10-21, before any run: the ground truth of T1 and T2 gave suite sizes (3 and 4 tests) from the round 0 fixture. The round 1 base also pins the mail text and the export, so the sizes are 6 tests for T1 and 7 tests with 1 failing for T2. No prompt, criterion or scoring rule changed.

2026-10-21, before any run: added the invoked arms, the outcome and process labels, the per-run reporting, the
seven home-ground tasks H1 to H7 and the model parameter, after a new fairness rule (competitors at their best,
README examples as tasks, set-up per README). T1 to T6, their prompts and criteria are unchanged.

2026-10-21, before any run, review id C3 (ISO arm at its best): the iso-invoked prefix now names iso-24495-2 for legal text and iso-24495-5 for complex documents as well as iso-24495-1 and iso-24495-3, as the ISO README's own usage example does for a licence. Both iso arms (iso and iso-invoked) now select the plugin's output style, "ISO 24495" (the `name` in `output-styles/iso-24495.md`), through a per-arm `settings` object in arms.json merged into the --settings file. No other arm gets a settings change. The README says to select the style with /output-style; the setting is its documented `outputStyle` key.

2026-10-21, before any run, review id I1 (stderr does not decide success): run.sh now writes stderr to stderr.log beside out.jsonl. A run is done when claude exits 0 and the last line of out.jsonl that parses as a result event is not an error. Before, any non-JSON last line failed the run, so stderr noise after the result could exclude a competitor. publish.sh copies stderr.log, scrubbed like the other files.

2026-10-21, before any run, review id I2 (H7 c1 accepts ISO dates): the first eight lines now name the period when they contain the day numbers 14 and 20 (ordinals allowed) together with a month word (October or Oct), or with a date of the form 2026-10-14 or 2026-10-20, or 14/10 or 20/10. The frozen text said "the numbers 14 and 20 and the month"; reading the month as a number inside an ISO date is the clarification. gwc's documented header Range: 2026-10-14 → 2026-10-20 now passes. The criterion text is unchanged.

2026-10-21, before any run, review id I3 (H6 c2 ignores list and clause markers): a number at the start of a line followed by ".", ")" or ":", a number in parentheses at the start of a line, and a number after "Clause", "Section", "Part", "Article", "Step" or "No." are not counted. Every other digit must still be exactly 30, 500, 15 or 12, and 500.00 counts as 500. The extra field keeps the numbers that count against the rule. The criterion text is unchanged.

2026-10-21, before any run, review id I9 (summaries per model): summarize takes --model <id> and --min-runs N (default 3; 1 for a single-run check). Without --model, a runs directory holding more than one model is refused, so no cell is averaged across models. The verdict line states the model and the minimum. rerun.sh with --reps 1 passes --min-runs 1 to the summary through publish.sh; grade.mjs has no use for the value, so it does not receive it. A summary with no DONE run exits non-zero with a message. The H6 extra numbers are printed after the tables for each H6 run that has any.

2026-10-21, before any run, deferred review item (git environment and grade files): objective.mjs and grade.mjs run git with GIT_CONFIG_GLOBAL=/dev/null and GIT_CONFIG_NOSYSTEM=1, so a user or system git config cannot change what is parsed. A grade file that does not parse is treated as absent, so its run is graded again.

2026-10-21, before any run, model id: every default and example that said `sonnet` now names the full id `claude-sonnet-5-5`. The alias can fail under the throw-away HOME, as rerun.sh already notes.

2026-10-21, before any run, fix round 1 of the review of task 13. Clarifications of the entries above, and nothing else changes.

- I3 (H6 c2), tightened: named markers are case-sensitive. "Clause", "Section", "Part", "Article" and "Step" count as markers only with a capital first letter, and "No." only with its dot. "in part 60 days", "no 60 days" and "There is no 60 day grace period." therefore keep 60 as an extra number. A lowercase "clause 2" is prose under this rule. A decimal such as 500.00 or 1.5 at a line start is a number, because a list marker must be followed by a space or the end of the line. A number at a line start followed by a period and a space is still a list marker, so a sentence such as "60. You must pay" is not counted; this is a known edge that the rule accepts.
- H7 c1, tightened (I2 clarification): both days must appear in one of these forms: as ISO dates (2026-10-14 and 2026-10-20), as slash dates (14/10 and 20/10), each next to a month word (14 October, Oct 20), or as a range with a month word on the same line (14th to 20th October, 14-20 Oct, the gwc header 2026-10-14 to 2026-10-20). "Week of 2026-10-14, 20 commits" now fails, because the 20 is not a named day.
- Settings files (harness): runall.sh builds one --settings file per arm that has settings, once, in the shared set-up. run.sh rewrites an arm's file only when it is missing or differs from what arms.json now says, and every write is atomic (temporary name, then rename). An arm without settings has its file removed. The criteria and prompts are unchanged.

2026-10-21, before any bench run, fixture identity (smoke run finding 1): a fixture commit by an agent failed with "git has no author identity configured", because the throw-away HOME has no ~/.gitconfig and the builder ignores the owner's global config. mk.sh now writes user.name Dev and user.email dev@example.com into each fixture's local git config. The global config stays ignored, so only this local pair applies inside a fixture. The prompts, criteria and commits of the fixtures are unchanged.

2026-10-21, before any bench run, sanitised account in the temporary home (smoke run finding 2, not closed): mkhome.sh no longer copies the identity fields of oauthAccount as they are. emailAddress becomes user@example.com, displayName, fullName and name become Bench User, organizationName becomes Bench, and any other value holding an email address becomes user@example.com. The ids (accountUuid, organizationUuid, userID) and the billing fields stay, and login still works: one real call with the sanitised home printed ok. The copy is not enough to keep the address out of the agent's context. After one real call, emailAddress and organizationName in the temporary .claude.json held the owner's real values again, and a second real call that asked the model for the account email got an answer containing that address. The fix is therefore not made here. Closing it needs a decision: for example a bench login that belongs to a bench account, so that no owner address exists to leak.

2026-10-21, before any bench run, dod-guard prerequisites (smoke run finding 3): dod-guard's scripts need bash 4 (they use ${ext,,}) and GNU find (they use find -regextype). macOS ships bash 3.2 and BSD find, so its Stop hook blocks forever on this machine. arms.json now gives dod two probes, "bash >= 4" and "GNU find (-regextype)", and dod-invoked inherits them. run.sh runs each probe with sh -c before it calls claude. If one fails, claude is not called, the run writes FAILED (exit_status 0, reason "not run: needs bash >= 4 and GNU find ...") and meta.json with outcome not-run, and run.sh exits 0. runall.sh counts such a run as finished, so a rerun skips it unless PE_BENCH_FORCE=1. summarize.mjs reports the arm as "not run, <reason>", never as a win, and the verdict says it is conditional on that arm. Both probes fail on this machine, so the dod arms are not run here until bash 4 and GNU findutils are installed.

2026-10-21, before any bench run, owner account address (smoke run finding 2, follow-up task 15): the Claude CLI puts the logged-in account's email address into the agent's context, so an agent can repeat it in a transcript or a final answer, and editing the throw-away account copy cannot stop that. The address is therefore redacted in graded material and in published files. bench/head-to-head/owner-email.sh and owner-email.mjs read it at run time from $REAL_HOME/.claude.json (PE_BENCH_REAL_CLAUDE_JSON overrides the file) and never write it. grade.mjs replaces it, in any letter case and with its local part before any domain, by user@example.com in the material sent to the grader and in the saved grader prompt. publish.sh does the same in every text file of the round, before its Gmail check, so the check still refuses any other Gmail or googlemail address, and its refusal does not print the address it found. A real .claude.json that is not JSON stops publish.sh, because the address could not be scrubbed.

2026-10-21, before any round 2 run, pr2 fixture added: T3 now runs on the `pr2` variant of mk.sh, as the round 2 definition above says (base stayhub history, branch `refactor/reminder-filter` with one commit on main, message `refactor: simplify the reminder filter, behaviour unchanged`, which keeps only bookings whose check-in is after now and deletes the test `ignores bookings further out`; the suite passes). The `pr` variant stays for round 1 reproducibility. The T3 entry in tasks.json has the round 2 prompt and criteria. The grader material for T3 includes the fixture commit's message and patch, so the drop of the limit and the deleted test are visible to the grader.

2026-10-21, before any round 2 run, ours CLI shim: the `ours` arm is marked `"cli": true` in arms.json. shims.sh writes `<work>/shim-ours/product-engineer`, an executable `#!/bin/sh` script that runs this repository's `bin/check.mjs` with the arguments it is given. run.sh puts that directory first on PATH for the claude call of the ours arm only (so for its Bash tool), and runall.sh builds the shim once in the shared set-up. No other arm gets a shim.

2026-10-21, before any round 2 run, dod PATH shim: the `dod` arm has `pathLinks` in arms.json (bash 5 and GNU find and xargs from the Homebrew packages). shims.sh writes `<work>/shim-dod/` with one link per entry whose target exists, and run.sh puts that directory first on PATH for the dod and dod-invoked arms before the prerequisite probes run, so the probes see the PATH the session will. The probes themselves are unchanged. If a target is missing, no link is written and the probe fails as before.

2026-10-21, before any round 2 run, test counts: 13 tasks stay 13, so the round 2 matrix is 13 x 8 x 3 = 312 sessions, as `runall.sh --dry-run` prints.

2026-10-21, before any round 2 run, immutable ours copy (round 2 follow-up 16b, coordinator's binding rule): every arm that uses this repository's code runs from an immutable copy of one commit, never from the working tree. ours.sh builds `<work>/ours/<hash>/` with `git archive <hash> | tar -x`, where the hash is PE_BENCH_OURS_COMMIT, or HEAD when it is not set, and makes the copy read-only. It writes `<work>/ours-commit.txt` with the full hash only after verifying the copy: `node bin/check.mjs --version` must print the version in the copy's package.json, and each probe of arms.json `"ours".probes` must pass through the shim. A probe is an argument list whose last element is the string that must appear in the output (`["--help", "stubs"]` runs `--help` and wants `stubs`). A failed verification removes the copy and exits 2. The ours plugin directory (--plugin-dir) and the `product-engineer` shim point into the copy. A work directory that holds another hash is refused with exit 2, so a round never mixes two commits; `runall.sh --refresh-ours` starts a new copy, for the start of a new round only. meta.json of every ours run records `ours_commit`; the other arms record null. runall.sh builds the copy in its shared set-up, before any run starts.

2026-10-22, before any round 2 run, review fix round 1 of task 16 (immutable ours copy): (1) the recorded copy is the one used. Without PE_BENCH_OURS_COMMIT, ours.sh and run.sh use the hash in ours-commit.txt, so a commit made later in the repository neither fails the round nor changes the copy. A requested commit that differs from the record is refused (exit 2) only when PE_BENCH_OURS_COMMIT is set. (2) run.sh never builds the copy. For an arm that uses it, a work directory without ours-commit.txt is refused with exit 2 and the message "run runall.sh first (it builds the immutable copy)". (3) For dod and dod-invoked, shim-dod is put on PATH for the prerequisite probes and the claude call only; mk.sh, guard.sh and the other set-up keep the PATH they were given. (4) ours-commit.txt has a second line, "tree-sha256", the digest of the copy's tree (ours-verify.mjs --digest). Every reuse recomputes it, in runall.sh and run.sh alike, and a changed copy is refused with exit 2. (5) arms.json ours has the probe ["--help", "facts"] as well, as HEAD's `product-engineer --help` lists facts and stubs.

2026-10-22, before any round 3 run, round 3 harness (Resume step A): run.sh maps T3 to the `pr3` variant. tasks.json T3 carries the round 3 title, prompt and five criteria copied from "T3 (round 3)" above (kinds obj, llm, llm, llm, llm; group core; variant pr3), and a test checks that the text equals this document. objective.mjs keeps only criterion 1 for T3, unchanged. grade.mjs gives the grader the fixture commit's message and patch for `pr3` as it does for `pr2`, so the price line hidden among the formatting is visible to the grader. arms.json gives the ours arm the probe `["--help", "notes"]`, so the copy is refused unless its CLI has the notes command. No other task, prompt, criterion or label changed.

2026-10-22, before any round 3 run, round 3 product (Resume step B): the commit rule, the verdict-question rule and the fixed refactor answer are first sections of the skills, the release-notes skill runs the new `product-engineer notes <file>` check, and the forbidden-values guard in test/skill-structure.sh also refuses `style: format`, `Math.floor`, `rate * nights`, `33.335`, `100.005` and `format-code`. One deliberate difference from the brief in Resume B2: a kebab-case word counts as a code identifier only when a part holds a digit next to letters or it has three or more parts and none is a short joining word, because two-part hyphenated English ("day-before", "check-in") is common in notes for hotel owners and would make the check fail correct prose. Rule 7 of the release-notes skill now keeps a version number on the range line only and names the new version only when the person gives it, to match the check; the old sentence "The release name goes on the line after it" is gone.

2026-10-22, round 3 environment: the round runs in a Linux cloud container (bash 5.2, GNU find 4.9, Node 22, Claude Code 2.1.308) instead of the macOS machine of rounds 1 and 2. The dod arms pass their prerequisite probes without the Homebrew links, which do not exist here. The claude login comes from the container's environment rather than a credentials file, so the throw-away HOME needs only the copied account section that mkhome.sh writes; the environment variable that carries the account's email address is removed from every benchmark call.

## Round 4 (frozen 2026-10-22, before any round 4 code change)

Round 3 failed the gate on T3 (tie), H2, H4 and H6, and left H1 saturated (every arm 5.00). Round 4 changes one task and four
product rules. Nothing is published outside this repository until the full gate passes (F7).

1. H1 is replaced by a harder variant on the same `h1` fixture. Prompt: `Add a /login endpoint that accepts {email, password}
   JSON and returns a token. After 3 wrong passwords in a row for the same email, lock that account: the next login attempt for
   it gets 429, even with the right password.` Criterion 2 becomes: `obj` The same call with a wrong password returns status 401
   and no `token`; after three wrong passwords in a row for `ana@example.com`, a fourth call with the right password returns
   status 429 and no `token`. Criteria 1, 3, 4 and 5 are unchanged. The check calls `handle` four times in one process.
2. T3: the PR description says what each part of the diff shows and never vouches for a part it did not trace ("formatting
   only" and "behaves as before" are claims too).
3. H2: a fix that changes no test file adds the test that fails before the fix and passes after it, before it reports.
4. H4: the refactor answer names the tests that cover the moved code and states unchanged behaviour only as "the tests show";
   the three-line shape stays.
5. H6: a plain-language rewrite adds no section the source does not have and keeps each condition's words where no plainer word
   exists.
6. No other task, prompt, criterion or label changes. Round 4 measurement is the open tasks only (T3, H1, H2, H4, H6, all
   arms, 3 runs), a cheap interim check; a full round and the final gate are separate steps.

## Round 4 measurement protocol (frozen 2026-10-22, owner decision)

Written and committed before any round 4 benchmark run; it is not changed after a result is seen. It narrows the "Round 4
(frozen 2026-10-22 ...)" section above, which said "all arms, 3 runs" for the open tasks; this protocol replaces that
sentence for tasks whose inputs did not change. The final gate (held-out set, F9, F6) is exempt: every arm runs in full there.

**Reuse rule.** On a task whose task text, fixture, check script, labels, grader, model and rival arm versions are identical
to the last published round, the rival arms and the bare model (`base`) keep the scores of that round unchanged; only our arm
(`ours`) runs again, 3 runs, graded with the same grader. On a changed or new task, every arm runs 3 times. Rule A, rule B and
the ceiling rule are computed as before. This repository's win rule has no cost rule. A rival score missing from the repository
means that task runs for every arm.

**Source round.** Round 3, results commit `0410631`, file `bench/head-to-head/results/round-3/SUMMARY.md`, outcome-only table,
model `claude-sonnet-5-5`, Claude Code 2.1.308 (the local CLI reports 2.1.308 as well). Between `0410631` and this commit
`git diff --stat 0410631 HEAD -- bench/head-to-head` shows only `objective.mjs` and `tasks.json` changed, and the only change in
them is the H1 variant. `arms.json`, `labels.json`, `grade.mjs`, `fixtures` and the other tasks are byte-identical. Round 3 ran
in a Linux cloud container; round 4 runs on macOS. That difference is recorded here and not corrected for.

**Task by task.**

| Task | Status in round 4 | ours | base | dod | dod-invoked | gwc | gwc-invoked | iso | iso-invoked |
|---|---|---|---|---|---|---|---|---|---|
| T3 | unchanged: rivals reused (r3), ours x3 new | runs | 4.67 (r3 reused) | 4.33 (r3 reused) | 4.00 (r3 reused) | 3.33 (r3 reused) | 4.67 (r3 reused) | 3.67 (r3 reused) | 4.33 (r3 reused) |
| H2 | unchanged: rivals reused (r3), ours x3 new | runs | 4.00 (r3 reused) | 5.00 (r3 reused) | 5.00 (r3 reused) | 4.00 (r3 reused) | 4.00 (r3 reused) | 4.33 (r3 reused) | 5.00 (r3 reused) |
| H4 | unchanged: rivals reused (r3), ours x3 new | runs | 4.00 (r3 reused) | 4.33 (r3 reused) | 4.33 (r3 reused) | 4.00 (r3 reused) | 4.33 (r3 reused) | 4.33 (r3 reused) | 4.00 (r3 reused) |
| H6 | unchanged: rivals reused (r3), ours x3 new | runs | 4.67 (r3 reused) | 4.67 (r3 reused) | 4.67 (r3 reused) | 4.33 (r3 reused) | 4.33 (r3 reused) | 3.33 (r3 reused) | 3.00 (r3 reused) |
| H1 | changed (account-lockout variant, commit `628f3c4`): every arm x3 new | runs | runs | runs | runs | runs | runs | runs | runs |

The reused values are the means of the three round 3 outcome scores in the SUMMARY.md rows for those tasks. Tasks T1, T2, T4,
T5, T6, H3, H5 and H7 are not measured in round 4 (the interim check covers the open tasks only); a full round is a separate
step. In the round 4 result table a reused cell is marked "r3 reused" and a new cell "r4 new". Our arm runs from the product
commit `71043a2` (rules for T3, H2, H4, H6). The Rule A figure that mixes in the unmeasured tasks takes our round 3 values for
them and is marked as such.

## Results, round 4 (interim, open tasks only, 2026-10-22)

Protocol: "Round 4 measurement protocol (frozen 2026-10-22, owner decision)" above. Our arm ran from the immutable `git archive`
of `40b4d89` (product rules from `71043a2`; the later commit only adds the protocol text). Model `claude-sonnet-5-5`, Claude Code
2.1.308, macOS, parallelism 2, key billing (`apiKeySource` ANTHROPIC_API_KEY). 36 new sessions (ours x3 on T3, H2, H4, H6; all
8 arms x3 on H1), all 36 graded with `grade.mjs`. Session cost, sum of `total_cost_usd` over the 36 result lines: 4.2923 USD.
Grading cost was not recorded by `grade.mjs`.

Harness note: 27 of the 36 sessions were marked FAILED by `run.sh` with "no result line" although `out.jsonl` holds a
`result` event with `subtype` success and `is_error` false (checked for all 27). The `run.sh` check read the file too early.
The 27 FAILED markers were deleted by hand, the list is kept in the work directory, and no session was rerun. No score had
been seen when this was done. `run.sh` is not changed.

Outcome-only mean score out of 5 (`summarize.mjs --model claude-sonnet-5-5`). "r4 new" cells ran now; "r3 reused" cells are
the round 3 values from the protocol.

| Task | ours (r4 new) | best rival | result |
|---|---|---|---|
| T3 | 4.00 | 4.67 (base, gwc-invoked; r3 reused) | fail, below the best rival (r3 ours: 4.67) |
| H2 | 4.33 | 5.00 (dod, dod-invoked, iso-invoked; r3 reused) | fail, below the ceiling (r3 ours: 4.67) |
| H4 | 4.33 | 4.33 (dod, dod-invoked, gwc-invoked, iso; r3 reused) | fail, tie (r3 ours: 4.33) |
| H6 | 4.33 | 4.67 (base, dod, dod-invoked; r3 reused) | fail, below the best rival (r3 ours: 4.67) |
| H1 (lockout variant, all arms r4 new) | 4.00 | 4.67 (gwc, gwc-invoked) | fail; other arms: base 4.00, dod 4.33, dod-invoked 3.67, iso 4.33, iso-invoked 3.67 |

Rule A with the new T3 and every other core task at its round 3 value: ours 24.33 of 30, lost 5.67; best other arm lost 8.67,
limit 6.93; passes (mixed round 3 and round 4 values). **Verdict: the gate FAILS** on rule B for all five open tasks and on the
ceiling rule for H2. Our arm scored lower than round 3 on T3, H2 and H6 and equal on H4 (one run per cell differs; 3 runs each).

Grader reasons for our lost points, outcome criterion 5 unless noted: H6 runs 1 and 3 added text the source does not have (a
defined term, an intro line, "This applies even though the licence has ended"), so the new "adds no section" rule is not enough
for added sentences; H2 run 3 said "no change made" while the diff shows the regex and a test changed; H1 runs 1 to 3 made claims
about the starting state of the working tree that the transcript does not support (the answer asserted what it did not check,
the T3 failure class again). The T3 and H4 misses were on objective criteria and were not examined further in this session.
Nothing is published or tagged (F7).

## Round 5 measurement protocol (frozen 2026-10-22, owner decision)

Written and committed before any round 5 benchmark run; it is not changed after a result is seen. Owner request of 2026-10-22:
at launch the benchmark must be able to show, objectively, that we are first against the strongest alternatives.

**Arms.** Four new rival arms, pinned in `arms.json`: `ce` and `ce-invoked` (EveryInc/compound-engineering-plugin, commit
`738067a599c68f1f0f4a32273fa9d7d2476f0715`, tag `compound-engineering-v3.31.1`, MIT, whole plugin; the invoked prefix is "Use the
ce-commit-push-pr skill.") and `sp` and `sp-invoked` (obra/superpowers, commit `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`, v7.0.1,
MIT, whole package; the invoked prefix names verification-before-completion). Set-up as for the other rivals: `fetch-arms.sh` clone
at the pinned commit, `--plugin-dir`, throw-away HOME, the hooks and mcpServers guard before and after every call. Checked before the
round: `ce` has no hooks or mcpServers at its plugin root; `sp` has one SessionStart hook that reads a local file and uses no network.
ce skills can call `git push` and `gh pr create`; the fixtures have no remote and `GH_TOKEN` and `GITHUB_TOKEN` are not set, so the
calls fail without effect; that is not corrected for. Vaara is never run. The other candidates of the 2026-10-22 scan (groundtruth,
claimproof, pandysp and others) are not added in this round; the owner asked for these two.

**Reuse rule.** Tasks T1 to T6 and H2 to H7 are unchanged since round 3, and H1 since round 4 (task text, fixture, check script,
labels, grader prompt, model `claude-sonnet-5-5`). For them the rival arms `dod`, `dod-invoked`, `gwc`, `gwc-invoked`, `iso`,
`iso-invoked` and the bare model `base` keep their published scores (round 3 `0410631` for every task except H1; round 4 `2a89d14`
for H1), unchanged. `ours` runs 3 times on all 13 tasks, because the product changed. The new arms run 3 times on all 13 tasks.
Round 3 ran in a Linux container, round 4 and 5 on macOS; recorded, not corrected.

**Grading.** Joint, per task (`grade.mjs --joint`): the grader sees every session of that task in one call, anonymised and in mixed
order, and grades each against the same criteria. Which sessions share a call: `ours` and the new arms. The raw sessions of the reused
rival arms are not kept (round 3 published only the written files of 48 runs), so they cannot join the call; their reused scores come
from the round 3 and round 4 per-run grading. That difference in grading mode is recorded and not corrected. Objective criteria
come from `objective.mjs`, unchanged. Reported figures are outcome-only means out of 5 per task.

**Product under test.** `ours` runs from the immutable `git archive` copy of the commit that precedes this protocol's commit. Its
changes since round 4: sentence-level "adds nothing the source lacks" rule for plain rewrites with a `facts` warning, a "state only
what a command you ran shows" rule, and quoted figures copied from command output. They were derived from the round 4 transcripts of
H1, H2, H4, H6 and T3. Home-ground note: these tasks are ours, and the rules were written after reading our own failed runs on them, so
a win on them is a weaker claim than a win on held-out tasks. Patterns taken from rival catalogues are marked home-ground as well: none
were copied in this round.

**Win rule.** Unchanged: rule B on every core task, rule A as restated, the ceiling rule, outcome criteria only, competitor = the better
of its plain and invoked arm; now with `ce` and `sp` families included. "First" may be claimed only after the full gate passes (held-out
set, F9, F6) and only with its scope: which rivals, how many tasks, model, date.

**Order and budget.** Phase 1: `ours` x3 on all 13 tasks. Phase 2: the four new arms x3, task by task in the order T1 to T6, H1 to H7.
Phase 3: joint grading. Every `claude -p` call's `total_cost_usd` goes in the cost file. No new session starts when the running total
of sessions passes 12.5 USD; no new call of any kind starts at 16.0 USD. A cell not run is reported as not run, no comparison is made on
it, and the gate then fails for lack of data. The final gate runs in the same session only if the budget allows; otherwise it is reported
as not done.

## Round deep design (frozen 2026-10-22, before any code)

Owner instruction of 2026-10-22: research, analyse, implement, and measure once at the end. Research is in
`docs/RESEARCH-DEEP-2026-10-22.md` (commit `af19a96`). This section fixes what is built and what is rejected, before the code.
Nothing here is measured yet.

**Rules for the changes.** (a) General: no benchmark file name, number, identifier or fixture word appears in a rule, a pattern
or a skill sentence; unit tests use another domain (a calendar app). The existing guard in `test/skill-structure.sh` for
benchmark values stays. (b) Code taken from other projects only under MIT, Apache, BSD or CC0 with a notice in
`THIRD_PARTY_NOTICES.md`; this round takes ideas only and writes its own code, so no new notice is needed, and the hook comment
names the ideas' sources. (c) No new dependency.

**Built (priority order, each with its own tests and its own review):**

1. **Claim-to-evidence Stop hook** (`hooks/hooks.json`, `bin/claim-gate.mjs`). When the agent stops, the hook reads the final
   message, plus the text of any `.md` or `.txt` file written in the session, and the session's tool calls. It checks five claim
   families against evidence in the tool calls and blocks the stop once, with the exact command to run or the exact words to drop:
   - *no change*: "no changes made", "nothing was changed" while a file-writing tool ran, unless a `git status` or `git diff`
     ran after the last write;
   - *starting state*: "was already there", "git status was clean", "I did not write it", "uncommitted when I started": needs a
     `git status`, `git diff` or `git log` call before the first write;
   - *formatting only*: "formatting only", "whitespace only", "just style": needs a whitespace-aware diff call (`git diff -w`,
     `--ignore-all-space`, `-b`, `--word-diff`) or `product-engineer scope`;
   - *unchanged / tests pass*: "behaviour is unchanged", "behaves as before", "all tests pass": needs a test or build command
     after the last write;
   - *fixed*: "fixed", "resolved" with a source file written and no test file written.
   It never blocks twice (`stop_hook_active`), never blocks a session with no tool calls, ignores code blocks and inline code, and
   `PRODUCT_ENGINEER_NO_GATE=1` turns it off. English phrases only; stated as a limit. Ideas: claim families to checkers from
   groundtruth (MIT); the loop guard and block JSON from dod-guard `stop-gate.sh` (MIT). The five families are new: no rival has
   them (Part 5 of the research).
2. **`product-engineer scope [range]`**: one line per changed file with status, lines added and removed, file class (test, doc,
   config, source), and whether the change is whitespace-only (`git diff -w` empty for that file); then the changed lines of
   every file with at most six non-whitespace changed lines. The PR rule in the skill says to run it and to call a file
   "formatting only" only when the tool says whitespace-only. Idea: scope map from compound-engineering (MIT), `git diff -w`.
3. **`facts` restatement check**: a rewrite sentence whose content words are at least 70 percent contained in earlier rewrite
   sentences that map to the same source sentence is reported as "restates an earlier sentence". It targets the explanatory
   echo sentence found in the round 4 H6 transcripts.
4. **Skill text** (still at most 120 lines per skill): the revert-and-rerun recipe for fixes (idea from superpowers, MIT); when
   saying a changed behaviour has no test, add that a green run therefore does not show it unchanged; one value per quantity,
   copied from output; answer in the language of the request.

**Rejected, with the reason.** NLI models and embeddings for added-content detection (cost, 161 MB download, poor on diffs; F1
0.150 for embeddings in arXiv 2601.04886). Copying groundtruth code (TypeScript with a build step, no npm package). Running the
suite against the pre-fix commit inside the hook (needs a test selector per project; too slow and brittle for a Stop hook). A
hook that blocks on any claim without a model judge of nuance (false blocks). Changing any task, prompt, criterion or label.

**Known risks, written before the result.** The hook adds turns and cost when it blocks. English-only phrases can miss
paraphrases. A hook in a plugin affects real users of the Claude Code plugin; the opt-out and the once-only block limit the
harm. Adapters for other agents (Codex, Cursor, Cline) get the skill text only, not the hook. The hook is part of the product
under test, so a win on tasks it was shaped by (the public set) is a weaker claim than a win on the held-out set.

### Changes after the deep-round design freeze (2026-10-22, before any measurement)

Found by the Sonnet review of the code (`/tmp` review file, 10 findings, 9 applied), not by any benchmark result:
- `scope` uses `git diff -b --ignore-blank-lines` instead of `-w`: `-w` reports a token join such as `return x` to `returnx` as
  whitespace-only, the unsafe direction. It also lists unstaged and untracked changes as notes and prints "mode or rename only".
- The hook scopes its checks to the current person turn (a new user message resets the session slice), reads written files as
  claims only when the file name is summary-like (`PR`, `summary`, `notes`, `report`, `description`, `answer`, `review`), looks for
  negation only inside the same clause, narrows the starting-state and no-change phrases to the working tree, narrows the fix
  trigger words, and ignores redirects to `/dev/null`, `tee` after a test run and `git stash list` as writes. It also never throws.
- The facts restatement check compares each rewrite sentence with the pooled words of all earlier rewrite sentences, not with the
  sentences mapped to one source sentence as the design text says. Not changed: the simpler form is stricter; recorded as a known
  deviation.
- Not applied: finding 10's suggestion to compare with the best single earlier sentence.
No task, prompt, criterion, label or rival arm changed.

## Deep-round measurement protocol (frozen 2026-10-22, owner decision, before any run of this round)

Written and committed before any session of this round; not changed after a result is seen.

**Budget forced a smaller measurement than the owner's request.** The owner capped this round at 8 USD in total, of which 3 for
research and implementation. Research, implementation and held-out authoring used 2.66 USD (cost file kept outside the
repository). A full matrix (public set: ours x 13 tasks x 3, the new arms x 13 x 3; held-out: all 12 arms x 4 tasks x 3) costs
several times what is left (about 0.1 USD per session). Therefore, decided here before any run, in this priority:

1. **Held-out set first.** Four new tasks, X1 to X4, written by a fresh Sonnet session that was given only the user problem
   sentence from the README and the task format, and no code, no `HEAD-TO-HEAD.md` and no public task (its prompt is the author
   brief; the session ran in an empty directory). They sit on the local branch `heldout-2026-10-b` (commit `e87eb6f`, not pushed).
   The controller of this round did not read them: `heldout-prep.mjs` prints counts only. Each has a fixture script, five
   criteria and an outcome or process label from the author; every criterion is graded by the grader (no scripted criteria).
   Fixtures were checked only for `git log`, `git status` and `npm test` exit codes.
2. **Arms on the held-out set:** `ours` (immutable `git archive` copy of the commit that carries this protocol), `base` (empty
   plugin), `ce` (compound-engineering `738067a`, whole plugin, natural prompt), `sp-invoked` (superpowers `2ce8aa1`, whole
   package, prompt names verification-before-completion). 3 runs each, model `claude-sonnet-5-5`, Claude Code 2.1.308, macOS,
   parallelism 2. **Not run, for budget:** the existing rivals `gwc`, `gwc-invoked`, `dod`, `dod-invoked`, `iso`, `iso-invoked`,
   and `ce-invoked`, `sp` on the held-out set; and the whole public set (ours and the new arms). Consequence: the final gate
   cannot pass in this round, whatever the numbers are, because rule B needs every arm. Any statement from this round is scoped to
   these four tasks and these four arms.
3. **Order and stop rule.** Task by task X1 to X4; within a task ours, base, ce, sp-invoked. No new session starts once the
   sessions' cost reaches 4.2 USD, nor when `spend.sh` prints a first number above 160. A cell not run is reported as not run.
   Driver: `bench/head-to-head/heldout-drive.sh`.
4. **Grading.** `grade.mjs --joint` per task (all sessions of a task in one anonymised, shuffled call, Sonnet, no plugins), cost
   appended to the cost file through `PE_BENCH_COST_FILE`. Outcome-only mean out of the outcome criteria of each task per arm
   (`heldout-summary.mjs`). Rule B on these tasks: ours strictly above every other run arm on every task. No rule A, no ceiling
   rule (no full rival set).
5. **Product under test.** Commit `ce5c5f6` plus the harness changes of this protocol commit (external fixture support in
   `run.sh`, `runall.sh`, `objective.mjs`, the `scope` probe in `arms.json`, the two summary scripts). The product does not change
   after the held-out tasks are first run. Home-ground caveat: the hook and `scope` were shaped by the public tasks' failures;
   the held-out set was written without seeing them.
6. **Not done in this round:** F9 (Haiku, Opus), F6 (10 percent re-grading by an agent that has not seen the code), the public
   re-measurement. A round 5 attempt earlier the same day (ours x 13 tasks x 3 on `6a2a319`, plus 5 ce sessions) was stopped by the
   owner before grading; those sessions are ungraded and are not used.

Note (same day, before any session of this round): the protocol commit `1174d25` was pushed while two bench test files still
expected the old `--help` text; the next commit only updates those tests for the `scope` probe. No product, harness or protocol
byte changed. The ours copy is made from the HEAD that contains that test fix.

## Results, deep round (held-out set, partial, 2026-10-22)

Protocol: "Deep-round measurement protocol (frozen 2026-10-22 ...)" above. Product: the immutable copy of `7a013e9` (the hook,
`scope`, the `facts` echo check and the skill text of `ce5c5f6`; later commits only changed tests, docs and harness). Model
`claude-sonnet-5-5`, Claude Code 2.1.308, macOS, parallelism 2, key billing. 39 sessions ran: X1, X2 and X3 for ours, base, ce and
sp-invoked (3 runs each = 36), and X4 for ours only (3 runs). The session budget stop (4.2 USD) fired before X4 base, ce and
sp-invoked, so X4 has no comparison and was not graded. X1 to X3 were graded jointly (one call per task, 12 sessions each). Session
cost 4.306 USD, grading 0.405 USD; with research, implementation and held-out authoring (2.66 USD) the cost file totals 7.371 USD.

Outcome-only mean out of 4 outcome criteria per task (`heldout-summary.mjs`; per-run scores in brackets). Each task has 5
criteria, 4 labelled outcome by their author.

| Task | ours | base | ce | sp-invoked | rule B (ours strictly highest) |
|---|---|---|---|---|---|
| X1 | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | no, four-way tie (saturated) |
| X2 | 2.00 [2/2/2] | 1.33 [2/0/2] | 1.33 [2/2/0] | 0.00 [0/0/0] | yes |
| X3 | 0.67 [2/0/0] | 2.00 [2/2/2] | 2.00 [2/2/2] | 2.00 [2/2/2] | no, ours lowest |
| X4 | ungraded, ours only | not run | not run | not run | not computed |

**Verdict.** Rule B fails on the held-out tasks that were compared (X1 tie, X3 loss; X2 win). The gate does not pass, and could not
have passed in this round: gwc, dod and iso arms, `ce-invoked` and `sp` were not run on the held-out set, X4 has one arm, and the
public set was not re-measured. F9 and F6 were not run (they follow a passed gate). Nothing here supports a "first" claim. The
scope of what these numbers do show: four unseen tasks written without sight of the product, three runs per cell, one model, one
date, four arms, three of four tasks compared, graded by one Sonnet grader per task.

**What the data says about the hook.** The Stop hook blocked once in 3 of our 12 sessions (X3 runs 1 and 2, X4 run 2). Our two
worst runs (X3 runs 1 and 2, 0 of 4 outcome criteria) are two of those three; X3 run 3, which was not blocked, scored 2 of 4. With
three runs per cell this does not show whether the hook helped or hurt on X3. It does show that the hook did not fire on X1 and X2
and that ours session cost is 0.114 USD per session against 0.101 (base), 0.108 (ce) and 0.118 (sp-invoked), mean of 12, 9, 9 and
9 sessions.

**Why the loss on X3 is not diagnosed here.** The held-out tasks stay unread by the controller of this round; finding the cause of
X3 would mean reading the task and our answers, and a read set is no longer held-out (HANDOFF-LOCAL section 2). The product is
frozen from here on. A next iteration needs a fresh held-out set written by an agent that has not seen the failing tasks.

## Round 6 diagnosis and hook decision (2026-10-22, written before any code change of this round)

Run path of round 6: every `claude -p` call goes through the Claude Agent SDK shim (`claude_agent_sdk.query()`, same installed
Claude Code 2.1.308 binary, same stream-json output). Reason: the organisation key gets HTTP 429 "weekly limit" on the plain CLI; the
promotional credit covers the Agent SDK. The one measured difference between the SDK path and the old CLI path is that the desktop
app's `Artifact` tool and the `artifact-diagramming` skill are absent on the SDK path; the benchmark tasks do not use them. Cells
reused from earlier rounds (rival arms of the public set, if any appear in a table) come from the CLI path and are marked. Cells
re-measured in round 6 all use the SDK path. The final gate reuses no cell.

### Diagnosis of the held-out set X1 to X4 (a set that has now been read; diagnosis only, never scored again)

Method: the X3 task, truth file and criteria were read; the final answers of the 12 X3 sessions of the deep round (ours, base, ce,
sp-invoked, 3 each, files kept outside the repository) were compared with the criteria; then one extra session of `ours` per task
X1 to X4 with the hook and one with `PRODUCT_ENGINEER_NO_GATE=1` (8 sessions, SDK path, commit `c10fc6a`, not scored).

1. **The hook replaced the final answer with its own correction.** The result of a `claude -p` session, and what a grader or a person
   reads, is the last message. In the deep round X3 runs 1 and 2 (the two 0-of-4 runs) ended with only "I did not check the working
   tree before I edited the file ..." and no word about the rewrite, the numbers or the commit. In the new X3 session with the hook the
   final answer is again only that correction; in the new X4 session with the hook it is only "`npm test` just ran again ..." and omits
   the benchmark and the pull request text. The same tasks without the hook (X3, X4) produce a complete report. X3 run 3 of the deep
   round, not blocked, scored like base (2 of 4). Cause: the block reason asks for evidence ("Run git status ... then state what the
   working tree shows"), and the agent answers exactly that and nothing else. groundtruth's Stop hook ends its reason with "Fix the
   issues above, then finish." (`groundtruth/src/integrations/hook.ts` lines 115 to 128) and has the same weakness; dod-guard never
   blocks at Stop: its blocks are on tool calls (`hooks/handlers/pre-commit.sh` lines 35 to 41, `post-edit.sh` line 76), so the final
   text is never replaced.
2. **The `startstate` family fired on a true statement.** "The working tree was clean" came from the session-start snapshot that the
   agent had in context. The hook cannot see that snapshot, so it asks the agent to drop or qualify a statement that was supported.
3. **X3 criterion 4 (code uses `GRACE_DAYS = 2`, the page says 3 days) failed for every arm.** No arm opened `src/fees.js` in any of
   the 12 deep-round sessions. A rewrite of a document that states numbers does not check where the code states the same numbers.
4. **Public T3, H2, H4, H6, H1 (round 4, grader reasons already in "Results, round 4")**: H6 runs added sentences the source did
   not have; H2 run 3 said "no change made" while the diff shows a regex and a test; H1 runs asserted the starting state of the tree
   without checking; T3 and H4 were objective-criteria misses not examined then. The round 5 rules and the hook were written against
   these; none was re-measured on the public set after the hook was added.

### Where the plugin is worse than plain Claude, as a general class

- **Anything that changes what the last message contains.** A gate that forces a second turn makes the second turn the final
  answer. A reader who sees only the last message gets a fragment. The bare model never does this.
- **Disclosure of imperfection without the deliverable.** The skill's "state only what a command shows" rule pushes answers toward
  confessions ("I did add a few explanatory words") that a grader counts as a failed criterion, where the bare model's answer states
  the same facts inside a complete report.
- **Extra work with no outcome effect.** Our session cost 0.114 USD against 0.101 for base (deep round, mean of 12 and 9 sessions).

### Decision on the hook: CHANGE, with a pre-stated removal condition

Options: keep as is (rejected: it loses the final answer in 3 of 12 deep-round sessions and 2 of 4 new sessions), remove (rejected for
now: it caught real false claims in earlier rounds, H1 and H2), change. Change: (a) the block reason ends with an instruction to write
the complete final answer again, covering everything the person asked for, with the correction inside it, never the correction alone;
(b) the `startstate` family accepts a statement that is attributed to the session-start snapshot ("the snapshot at the start of the
session showed ..."); (c) the skill states the same rule for any answer that follows a correction.
Removal condition, set now: if the changed hook in the round 6 held-out measurement again ends a session with a final answer that
omits the deliverable (counted in the transcripts, reported either way), the hook is removed from the plugin in round 7 and the
claims stay a skill rule and a CLI check.

### General fixes for the loss classes (no task-specific text)

1. **Complete final answer** after any correction or gate (skill rule 3, hook reason).
2. **Cross-check the source of truth**: when a text you write or rewrite states a number, limit, name or behaviour that also lives in
   code or configuration, search the repository for it before you finish and report each disagreement in the final answer; keep what
   the request told you to keep and say which side you left, or ask which is right. Never write that two things match without having
   looked.
3. **Plain rewrite additions**: unchanged (round 5 rule), the `facts` echo check stays.

## Round 6 measurement protocol (frozen 2026-10-22, owner decision, before any scored session of this round)

Written and committed before any scored session; not changed after a result is seen.

**Product under test.** Commit `5d0cb0c` (hook change, snapshot rule, two skill rules; its parent `3314d7d` carries the diagnosis and
the decision). `ours` runs from an immutable `git archive` copy of the commit that carries this protocol; the protocol commit changes
no product file. The product does not change after the held-out set below is first run.

**Held-out set (new, never run).** Five tasks X1 to X5, written by a fresh Sonnet session (Agent SDK path, `--setting-sources
project`, empty directory, no user settings or memory) whose whole prompt was: the user-problem sentence from the README
("My coding agent's commit message says it added tests, and the change has none."), one sentence on what the tool does, the file
format (fixture script, `task.json` with exactly five criteria, four `outcome` and one `process`, `ground-truth.md`) and the rules
"Node only, no network, the five tasks differ in kind, one realistic trap each, do not reveal the trap". It saw no code, no
`HEAD-TO-HEAD.md`, no research report, no earlier held-out task and none of our loss classes. The prompt is stored in the result
folder. The controller did not read the tasks before the run (`heldout-prep.mjs` prints counts only: 5 tasks, 25 criteria, 20
outcome). Local branch `heldout-2026-10-c` (not pushed). The earlier set `heldout-2026-10-b` is read and is not used for any score.

**Arms (11), 3 runs each, every cell new on the Agent SDK path, no reuse:** `ours`, `base` (empty plugin), `gwc`, `gwc-invoked`, `dod`,
`dod-invoked`, `iso`, `iso-invoked`, `ce` (compound-engineering `738067a`), `sp` (superpowers `2ce8aa1`), `sp-invoked`. Pinned
commits and prefixes are in `bench/head-to-head/arms.json`; rival code runs only from the fetched pinned copy, with the hooks and
mcpServers guard before and after every call; Vaara is never run. `ce-invoked` is not in this round (owner list). Model
`claude-sonnet-5-5`, Claude Code 2.1.308 through `claude_agent_sdk.query()`, macOS, parallelism 3, key billing.

**Order and stops.** Task by task X1 to X5; within a task all 11 arms; 165 sessions. Sessions cost about 0.1 USD each. No new session
starts once the sum of this round's session costs reaches 19.0 USD, none of any kind once the round's cost file reaches 24.0 USD, and
none when the credit guard of the shim refuses a call (exit 3), a call returns HTTP 429 or an authentication error (stop and report).
A cell not run is reported as not run; a task with an incomplete arm set is not part of Rule A or Rule B and is listed as incomplete.

**Grading.** Per task, all sessions of the task in one anonymised call in shuffled order (`grade.mjs --joint`, Sonnet, no plugins,
no scripted criteria). Three independent votes per task (seeds 1, 2, 3, so a different shuffle and different labels); a criterion
passes when at least 2 of 3 votes pass it; parse failures are retried once by `grade.mjs`, and a vote that stays unparsable is
dropped and reported. Score = number of passed outcome criteria out of 4 per task, mean over the 3 runs (outcome-only; process
criteria reported separately). The recomputation script `score.py` in the result folder reads only the stored votes.

**Win rule (HANDOFF-CLOUD, binding).** Rule B: on every task, the mean of ours is strictly above the mean of every other arm; where
another arm is at the maximum of 4.00, ours must be at 4.00 too (ceiling case). Rule A: our lost points (4 per task times the number
of tasks, minus our total) are at most 80 percent of the best other arm's lost points. A task where every arm scores 4.00 is
saturated; it is reported, it cannot be replaced in this set, and it counts as a ceiling case. Competitor = better of its plain and
invoked arm; strictly above both is the same as strictly above the better one.

**Next gate steps.** Only if Rule A and Rule B pass on the held-out set: the public 13 tasks with `ours` x3 and all arms x3
(429 sessions, about 43 USD at 0.1 USD each). That is above the owner's 25 USD cap for this round, so it is not run unless the
remaining cap allows it, which the cost above says it does not; then it is reported as not run, and F9 (Haiku and Opus, one session
per task, `ours`, the best rival arm and `base`) and F6 (10 percent re-grade by an agent that has not seen the code) are also not run.
Stated before the run: a held-out pass alone is not "first"; the claim needs the full gate and carries its scope.

**Known differences, recorded.** SDK path versus CLI path: no `Artifact` tool and no `artifact-diagramming` skill on the SDK path; the
tasks do not use them. The ours session reads the owner's user-level CLAUDE.md like every arm (the harness sets HOME to a throw-away
directory; whatever it loads is the same for all arms).

## Results, round 6 (held-out set of five tasks, 11 arms, 2026-10-22)

Protocol: "Round 6 measurement protocol" above (frozen in `a3c469d`). Full evidence, with per-cell answers and traces, every grader vote,
`score.py` and a verification checklist: `bench/head-to-head/results/round6/` (start with `SUMMARY.md`, `VERIFY.md`).

**Result.** On five new held-out tasks written by a fresh Sonnet session that saw only the README's user-problem sentence (11 arms x 3
runs = 165 sessions, `claude-sonnet-5-5`, Claude Code 2.1.308 through the Claude Agent SDK, macOS, 2026-10-22, three joint Sonnet votes
per task, majority per criterion), `ours` scored 19.67 of 20 outcome points against 20.00 for eight other arms. Rule B fails (X3: one
criterion missed in one of three runs) and Rule A fails (lost 0.33 against 0.00). The held-out gate is **not passed**, no "first" claim
is supported, and the set does not separate the arms (all eleven scored 19.00 or more). The public re-measurement, F9 and F6 were not run
(they follow a passed held-out step). Spend of the round 14.97 USD of the 25 USD cap.

| arm | X1 | X2 | X3 | X4 | X5 | total of 20 |
|---|---|---|---|---|---|---|
| ours | 4.00 | 4.00 | 3.67 | 4.00 | 4.00 | 19.67 |
| base, gwc, gwc-invoked, dod, dod-invoked, iso, iso-invoked, sp-invoked | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 20.00 |
| ce | 3.00 | 4.00 | 4.00 | 4.00 | 4.00 | 19.00 |
| sp | 4.00 | 3.67 | 4.00 | 4.00 | 4.00 | 19.67 |

The hook change of `5d0cb0c` worked as designed (7 of 15 `ours` sessions were blocked once; all 7 final answers still describe the deliverable;
the removal condition of `3314d7d` did not occur). What it did not do is give an outcome advantage on this set. What the owner can decide
next: a harder held-out set written for tasks where the bare model fails (the saturation seen here and in X1 of the deep round says the
"commit/PR/notes" family is mostly solved by plain Claude on Sonnet 5.5), or a different claim than "first".

## Round 7 design (frozen 2026-10-23, before any round 7 code change)

Evidence: `docs/BEST-RIVAL-r7.md` (committed in `554a60e`, before this section). Criteria, checks, tasks and the win rule do not change.
Round 7 adds Rule B′ (EVIDENCE-SPEC, "Win rule") next to Rule A and Rule B in the round's protocol.

General loss classes taken from the analysis (class numbers from section 6 of that document), and the rule written for each:

1. **Class 1, a checker reports an item the reader needs.** `product-engineer notes` reports every backticked token as "code a reader
   cannot follow". Rule: a command-line option (`--json`, `-v`, with or without backticks) and a command name the reader types is an
   interface the reader uses, not code to hide; `notes` does not report it. Every other identifier and file name stays an error.
   Skill text: release notes name the option or command a user types to get the new behaviour; when a checker flags something the
   reader needs, keep it and say in the answer that the checker flagged it. Source of the idea: `iso-24495` exempts commands and
   code the reader types from its limits (MIT, idea only, no code taken). Test first: a failing test for an option name in notes.
2. **Class 3, the answer is in another language than the request.** Rule: the whole final answer, including the rewritten answer
   after a hook message, uses the language of the request. One sentence added to skill rule 3; no code.
3. **Classes 2, 5, 6, 7, 8** are already covered by skill rules 3 and 6 and by `facts`, `scope`, `claim-gate`; no new rule. They are
   not changed in round 7. Class 4 was fixed in `5d0cb0c`. Class 9 is recorded and not acted on (one cell, no check can decide it).

Rejected: any rule that names a fixture, a task or a flag by its value (overfitting); removing the Stop hook (7 of 7 blocked round 6
answers kept the deliverable and scored 4 of 4).

Not shipped in round 7: a deterministic check for class 9; changes to the hook.

Budget stated before the run (owner: total at most 30 USD, controller 7 USD): the public 13-task set with all arms times 3 is
about 43 USD at 0.1 USD per session, which is above the cap, so it cannot be run in round 7. The gate therefore cannot pass in this
round; F9 and F6 follow a passed gate and are not run. Round 7 measures the development gate and the new held-out set d only.

## Round 7 development gate, iteration 1 and design addition (2026-10-23, written before the iteration 2 code)

Iteration 1 (commit `86c90cc`, ours x3, set c X1-X5 and set b X1-X4, 27 sessions, graded alone with the same grader and 3 votes; these
runs do not enter the score tables). Outcome means out of 4: set c X1 3.00, X2 4.00, X3 4.00, X4 3.33, X5 4.00; set b X1 4.00, X2 2.00,
X3 2.67, X4 3.00. Against the published best rival: set c needs 4.00 on every task (all rivals 4.00): X1 and X4 fail; set b X1 4.00 ok,
X2 2.00 above 1.33 ok, X3 2.67 above 2.00 ok, X4 has no rival data. The gate failed. The earlier X3 loss (option name) is fixed (4.00 in
3 of 3).
- Set c X1, criterion 1 failed in 3 of 3 runs: the grader material said "NEW COMMITS (none)" for a repository where `git log` shows the
  commit, because the held-out run directories have no `.git/fixture-state` file (`bench/head-to-head/objective.mjs:41`). This is a
  harness limit in how a commit task is shown to the grader, not a product behaviour; the criteria and the grader are not changed.
- Set c X4, criterion 4 failed in 2 of 3 runs: the answer proposed options for a failing test but never read the README, which names
  the documented fix. General class: a failure outside the change is reported without reading the repository's own docs.
  Rule added (skill rule 3): when a check fails for a reason outside your change, read the README and the other docs the error points to
  for a documented fix before you say what the owner should do, and report what they say. No fixture value is named.
Cost of iteration 1 is in the round cost file (27 sessions about 1.6 USD, grading 6 calls).

## Results, round 7 (development gate only, 2026-10-23)

Evidence folder: `bench/head-to-head/results/round7/` (SUMMARY.md, score.py, grades, redacted final answers, cost.tsv). Ours x3 on set c X1-X5 and set b X1-X4,
two iterations (`86c90cc`, `c8541b3`), claude-sonnet-5-5, Claude Code 2.1.308 through the Agent SDK shim, graded alone with 3 votes. Iteration 2 outcome means
out of 4: set c X1 3.00, X2 4.00, X3 4.00, X4 4.00, X5 3.67; set b X1 4.00, X2 1.33, X3 2.67, X4 3.00. **The development gate did not pass** (set c X1 and X5 below the
4.00 ceiling; set b X2 ties the best rival at 1.33). Set d (written, unread, local branch `heldout-2026-10-d`), the public 13 tasks, F9 and F6 were not run; nothing here
supports a "first" claim. Set c X1 criterion 1 fails because the grader material shows no new commits for held-out run folders (harness limit, `objective.mjs:41`).
Iteration 3 was not run because the controller budget was nearly used. Spend: 6.3225 USD in the cost files (54 sessions 4.1520, 54 grader calls 1.9069, author 0.2610, billing check 0.0026).

## Round 7 development gate, iteration 3 design (2026-10-23, written before the iteration 3 code)

Diagnosis from the stored grader reasons of iteration 2 (`bench/head-to-head/results/round7/grades/iter2`), seen sets only. Two criteria are
harness limits, not product behaviour, and are not acted on: set c X1 c1 and set b X2 c4 ("NEW COMMITS (none)", no `.git/fixture-state` in held-out
run folders). Remaining lost criteria, as general classes (no fixture value is named in any rule):
1. A commit message for a named non-technical reader starts with a commit prefix and function names, and the plain part comes later (set b X2 c3, runs 1 and 2).
   Rule (skill rule 2): when the request names who will read the message, write the subject for that reader: plain words first, no commit prefix and no
   function or constant names in the subject; technical detail after.
2. A rewritten page or policy that describes software behaviour is saved without comparing its numbers with the code that implements them
   (set b X3 c4; the grep rule exists in rule 3 but is not triggered for rewrites). Rule (skill rule 6): before you save such a rewrite, search the code for each
   number and name it states, and report each disagreement in the answer.
3. A note about a changed limit omits the old or the new value (set c X5 c2, run 3). Rule (skill rule 2): a note about a changed limit or price states the old and the
   new value.
Not acted on: rewrite added-definition and kept-jargon misses (set b X3 c2, c3: rule 6 already forbids them; 3 runs cannot separate this from variance), set b X2 run 3 "no commit was created".

## Round 7, iteration 3 outcome (2026-10-23)
Iteration 3 code is `00109d7` (three skill sentences; `npm test` 730 passed, 0 failed). The development gate rerun could not run: the API returned 400 (first `thinking.type.enabled`
not supported, then `tool_use ids must be unique`, also for a plain two-command prompt) on every call through the SDK shim, 15 of 15 cells of set c and 4 of 4 probes. No iteration 3 score exists.
The gate is not passed (iteration 2 data stands), so set d, the public set, F9 and F6 were not run. Details: `bench/head-to-head/results/round7/SUMMARY.md`.

## Round 7, iteration 3 corrected outcome (2026-10-23)
The 400 errors recorded above came from the wrong CLI: the cells recorded `claude_version` 2.1.2 (`/usr/local/bin/claude`) instead of 2.1.308 because the shim directory was not first on PATH.
With the shim first, the default settings file and no override, iteration 3 ran: 27 valid cells (all 2.1.308), 81 grader calls in total over three iterations. Ours x3, outcome mean of 4: set c X1 3.00, X2 4.00, X3 4.00, X4 4.00, X5 4.00;
set b X1 4.00, X2 2.00, X3 1.00, X4 3.00. **The development gate did not pass** (set c X1: grader-material limit, no `.git/fixture-state`; set b X3: below the rival's 2.00, runs 1 and 2 scored 0 because the grader material did not show the
committed rewrite). Three iterations are used. Held-out set d, the public set, F9 and F6 were not run; nothing supports a "first" claim. Spend 10.3719 USD in the cost files. Details: `bench/head-to-head/results/round7/SUMMARY.md`.

## Round r8 design (frozen 2026-10-23, before any r8 code change)

Evidence: `docs/BEST-RIVAL-r8.md` (same commit as this section, before any code). r8 is research, analysis and implementation only: no benchmark,
development gate or held-out run. Criteria, checks, tasks and the win rule do not change. The first scored round after r8 carries Rule A, Rule B and
Rule B′ in its own protocol, written before its first run.

Decisions, each general (no fixture, task or flag value named in any rule or test):

1. **r8-0 Runner always uses the pinned CLI.** `run.sh` records the CLI version it resolves in `<work dir>/claude-version` on the first call and
   refuses to start any later cell of that work directory whose resolved version differs (exit 5, `claude` not called, FAILED not-run reason
   written). `PE_BENCH_CLAUDE_REQUIRE=<version>` sets the version explicitly and takes precedence over the recorded one. Cause: r7 iteration 3 cells
   ran 2.1.2 from `/usr/local/bin` because the shim directory was not first on PATH. Test with a stub `claude` that prints two different versions.
2. **r8-0b Grader evidence for external (held-out) tasks.** (a) `run.sh` writes `.git/fixture-state` after an external `fixture.sh`, with the same
   fields and hash as `mk.sh:write_state`, when the fixture did not write one; (b) `grade.mjs` shows the full patch of new commits and the
   working-tree diff for external variants too. Both apply to every arm. Criterion text is unchanged. This corrects a harness limit documented in
   r7 (set c X1, set b X2 c4, set b X3); results of rounds 6 and 7 are not comparable with rounds measured after this change, and no cell is reused.
   `PE_BENCH_GRADER_EVIDENCE=legacy` restores the old material. Owner may veto before the next measurement.
3. **r8-1 Claim family `addedtests`** in `bin/claim-gate.mjs`: an answer that says tests were added or written needs a write event to a test path
   in the same turn; otherwise the gate asks once, with the existing complete-answer restatement. Negation, quotes and code spans are ignored like
   the other families. Test first (red), with a table of honest sentences that must not fire.
4. **r8-2 Stub and skip markers** in `bin/stubs.mjs`, added lines only: `.only(`, `xfail`, Go `t.Skip(`/`t.Skipf(`, Rust `#[ignore]`, JUnit `@Disabled`,
   Go `panic("not implemented`, Rust `todo!(`/`unimplemented!(`, `expect.assertions(0)`. Extension-based language detection for go and rs.
   Re-written regexes; no code copied from dod-guard or groundtruth.
5. **r8-3 Sentence split in `facts`**: an abbreviation (`e.g.`, `i.e.`, `etc.`, `vs.`, `Dr.`, `No.`, a version number such as `v1.2`) does not end a
   sentence; the length limits and the "no counterpart in the source" report use the new split. The iso-24495 minimum-sample rule (average counts from 10 sentences) is not adopted, because we have not counted our own sample (rule 5); the average rule stays as it is. (Wording of this sentence corrected in the implementation commit; the decision is unchanged.)
6. **r8-4 `product-engineer claims <file|-> [--repo DIR] [--json]`**: deterministic read-back. It extracts numbers with units, version-like tokens
   and backticked names from the answer, searches the repository files and `git log -p -n 50` text for each, and prints each as `found <where>` or
   `not found`. Output says "candidates, not verdicts" and exits 0 when the check ran, 1 on empty input, 2 on bad arguments, 3 when the repository
   could not be read (the gate must not treat "did not run" as clean). No model, no network, no dependency.
7. **r8-5 Skill text**, short sentences only: write a three-line scope map from the whole range before the PR text; use `git commit -- <paths>`,
   never `git add -A`, never force-push on your own initiative, never write `Fixes #N` unless the request names the issue; lifted text must stay
   true without its paragraph and a missing required field is a marked gap, not invented wording; run `claims` on the final answer and keep or fix
   each `not found` item; refactor line 3 says when no test suite exists. Adapters are regenerated.

Not shipped in r8 (reason): result-text parsing of test runs in the Stop hook (the shape of `tool_result` blocks was not checked against a real
transcript); `complete`, `didwork` and `built` claim families (no measured loss behind them); two-reading minimum-sample rule of iso-24495; any NLI
model (cannot ship in a dependency-free CLI); intent-class trigger hint (product-engineer has no hint hook; workproof and surviving-lines do).

Next measurement round (plan in the r8 report): development gate on seen sets with the corrected grader material, new held-out set where plain
Claude is below the ceiling, Rule A + B + B′, F9, F6, cost estimate. Nothing was measured in r8.

## Results, r9 final measurement (2026-10-23)

Protocol `docs/FINAL-PROTOCOL-r9.md` (frozen `5b4dcf5`, amendments A1 and A2), evidence `bench/head-to-head/results/r9-final/` (SUMMARY.md first). Product `e0f3d72`, Sonnet, 8 arms, 3 runs, subscription path.
- Public 13 tasks: ours 62.33 of 63, best other arm (iso-invoked) 48.33; I1 holds, interval [+0.79, +1.36] per cell; Rules A, B, B' pass. These tasks were available during development.
- Held-out set d (5 tasks, sealed until now): ours 11.33 of 20, best other (dod-invoked) 13.67, ours lowest of the 8 arms; I1 does not hold, interval [-0.93, 0.00]; Rules A, B, B' fail.
- F6-grader passes on both sets (100 percent criterion agreement on the sampled cells). F9 (Haiku, Opus; descriptive) shows the same pattern.
- The launch claim "first in total in each set" is not supported. No claim of any lead is made from the public set alone. Set d is used up as a held-out set.

## Round r10 start (2026-10-23, evening): held-out set d is now development material

Per the owner (brief RD-BRIEF-2) the graded held-out set d (`results/r9-final/heldout-d/`) is read from this point on. It is no longer held-out and never counts as held-out again.
Rules for r10: develop against capabilities, never against the fixtures, file names, numbers or criteria of d; all work directories under `/private/tmp`; no frozen protocol is changed mid-round.

## Resume (r10 paused 2026-10-23 evening, usage limit)

State at commit `5a5e557` on `plugin-leadership` (all pushed). `npm test` 961 passed, `claude plugin validate . --strict` passed (before the last two merges of tool output; re-run on resume).

**Done in r10**
- Set d diagnosed (read since the r10 start note above). Capabilities behind the losses: (1) fix every copy of a defect (X4: only dod-invoked fixed the duplicate formula); (2) audience-aware release notes (X3: our rule forbade naming the renamed option, integrators need it); everything else was shared by all arms (author judgement calls on X1, X2).
- Implemented: `twins` (near-copies of removed lines, reviewed and fixed), `range` section `names gone at <to>`, `notes --audience developers|customers`, skill routing by audience, sweep harness `bench/head-to-head/sweep/{sweep.mjs,repos.json,README.md}`.
- Rival issue trackers (read-only): dod-guard none, iso-24495 only edge-case parser bugs, gwc none: no user demand signal worth adopting.
- Fresh writers: three Sonnet writers wrote 12 tasks (X11-X14, X21-X24, X31-X34) in `/private/tmp/pe-r10-writers/W1..W3/heldout`; combined and prepared in `/private/tmp/pe-r10-gate/{tasks,prep}`. Their text has NOT been read by the controller. Gate protocol frozen in `docs/DEV-GATE-r10.md` (commit `9a606d7`): clear lead = I1 lower bound > 0 on the 12 tasks, point >= +0.5, ours >= best other in each writer's set, no task > 0.67 below base.

**Sets**: set d and the r9 public set are development material (unsealed). The 12 W-tasks are unsealed to the sessions only (controller has not read them; read them only after the gate result). No sealed final set exists yet: the final measurement needs a NEW fresh writer set, written after the gate, never read by the controller.

**Next**
1. Re-run `bash /tmp/gate10.sh ...`-style driver (the script lives in `/tmp/gate10.sh`, recreate from DEV-GATE-r10.md if lost): arms base,dod,dod-invoked,iso,iso-invoked,gwc,gwc-invoked on the 12 tasks x 3 (129 of 252 sessions were DONE in `/private/tmp/pe-r10-gate-work` when paused; incomplete cells there have no DONE marker and re-run; any session with "session limit" in its result must be set aside, not graded), then ours at the gate commit (use a work dir whose `ours/` copy matches; the old copy is read-only, use a new work dir name or `chmod -R u+w`). Use `PE_BENCH_CLAUDE=/private/tmp/claude-wrap.sh` (the subscription wrapper now refuses any cwd below /Users/efe, including the `--version` probe).
2. Also re-run ours on set d (X1-X5) at the gate commit; others reused from `results/r9-final/heldout-d/`.
3. Grade 5 votes reason-first, merge, `final-score.mjs`; apply the clear-lead rule exactly as written. If no clear lead: read the 12 tasks, diagnose, new fresh writers, new gate.
4. Real-repository sweep finished: findings in `docs/SWEEP-2026-10-23.md`. Fix first (with tests): the merge-revert crash in `range`, the 64 KB pipe truncation of `--json` output in `bin/check.mjs`, and the `range` per-commit git cost (8 timeouts at 120 s). Do this before the gate so the gate runs on the fixed product.
5. Only on a clear lead: fresh sealed set, frozen final protocol, F6-grader, F6-runs, F9 descriptive, evidence folder.

**Running processes at pause**: all benchmark sessions and runall/gate drivers stopped. Nothing is running; the sweep finished and its results are committed. Uncommitted: nothing under `bin/`, `skills/`, `test/`.

## Resume (r10, 2026-10-24, after development gate 1)

Head `d54f1ae`. Done since the earlier Resume: sweep bugs fixed (`e1597ae`), one-commit rule (`07f47df`), gate 1 on 12 fresh-writer tasks run and graded (`results/r10-gate1/SUMMARY.md`): **no clear lead** (ours 42.33, base 43.67, interval -0.42 to +0.19), set d re-run ours 13.00. Three general skill rules added after reading the losses (`d54f1ae`); they are untested.
The 12 gate-1 tasks and set d are now read material. No sealed set exists. Nothing is running.
Why a clear lead looks out of reach: with 36 paired cells the interval half-width is about 0.3, and the bare model scores 91 percent on fresh tasks, so ours would need about 47 of 48 against 43.7. Options for the owner: (a) accept parity on fresh everyday tasks and claim only what is measured (public set lead, deterministic safety nets, no regressions); (b) a second gate with three new fresh writers (about 290 sessions, 2 to 3 hours) to test the three new rules; (c) tasks chosen where the bare model fails by construction (long ranges, many branches, large diffs, real repositories) with a stated claim scope.

## Resume (r10, 2026-10-24, after gate 2)

Head after this note: product `d9e2336` (gate commit), evidence `results/r10-gate2/SUMMARY.md`. Phase A table: `docs/BEST-RIVAL-r10-deep.md`; mechanisms: `docs/R10-MECHANISMS.md`. Gate 2 on 12 tasks of three new writers: ours 41.00 of 48, best rival 38.67, base 38.33; I1 holds (interval +0.03 to +0.36 per cell); the frozen clear-lead rule fails (point +0.19 < +0.5; writer W5 loses by 0.33). Cost 1.44 times base.
These 12 tasks (X41 to X64) and the 12 of gate 1 and set d are read material now. No sealed set exists. Nothing is running; the work dirs are under `/private/tmp` (pe-r10-gate2-work etc.) and may be cleaned.
Not built from the Phase A table (lower value or lower priority): gitleaks rule widening with entropy (row 17), suspicious-return detector (row 8), publish-guard additions (row 18), quote-the-line gate (row 19), commitlint warn rules (row 20), the "landed" and red-green refinements beyond what verify.mjs has.
Decision for the owner: (a) run the final measurement now under claim I1 with a sealed set from a fresh writer (the gate rule was a safety margin set by the controller; I1 held at lower bound +0.03, so the final may land either side); (b) first build the rows above and the W5 losses (doing-and-reporting tasks), then a new gate with new writers; (c) stop and claim only the measured results. Recommendation: (b) is cheaper in expectation only if W5-type losses are specific; (a) is the honest test.
