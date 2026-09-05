# Changelog

## 0.3.3 (unreleased)

`check --diff` now has a measured baseline. `npm run baseline` mutates the real commits of
whatever repository it runs in so each message contradicts its own diff, then asks whether the
checker notices, and writes `evals/baseline/RESULTS.md`. On this repository at 200 commits:
**specificity 100% over 58 real messages with zero false alarms**, and recall 100% on the four
kinds of inconsistency any check can reach, 0% on the one deliberately included that none can.

Running it found three false alarms on real commits, all now fixed. A file count is only read as
a claim about the change when a change verb governs it: "a run left five files modified" describes
a previous run, and "Cursor users can drop one file into their project" borrowed its verb from the
`What changed:` heading while counting something a reader might do. A planning artefact that
describes tests is no longer read as a claim that tests were added, so "the design now has a plan
with the tests written out" stays quiet. And a claim phrase inside a longer hyphenated identifier
is a name rather than an assertion, so a message that mentions `extra-docs-only` is no longer read
as calling the change documentation only. The cost of the first fix is that the passive "five files
were changed" goes unchecked, which is a miss rather than a false alarm.

The design and its limits are in
`docs/superpowers/specs/2026-09-05-product-engineer-baseline-design.md`, including why the
CodeFuse-CommitEval dataset this was meant to run against could not be used: its data file is a Git
LFS pointer to an object that is not on the server.

## 0.3.2 (2026-09-05)

`check --diff` reads the change and reports where the message and the diff disagree: tests
claimed with no test file gaining a line, "documentation only" over a source change, a stated
file count the change contradicts, and a path named that is in neither the change nor the
repository. With no range it reads the staged change, which is what the commit-msg hook is
about to record. The flag is opt-in and every finding is a warning, so an existing run cannot
turn red on the upgrade and the output without it is byte-identical.

A phrase inside backticks or quotation marks is named rather than claimed, so a message that
describes these checks is not read as making them. Found by running the new flag on its own
commit, which is the first thing it caught.

The checks are deliberately narrow. A refactor claiming no behaviour change is not tested
against the source it touches; a number is read as a file count only when its sentence also
carries a verb of changing; and a named path that exists but is untouched is ordinary context,
so only a broken reference is reported.

## 0.3.1 (2026-09-05)

A skill joins the pack only when the eval measures it. Every skill in `skills/` now declares `metadata.measuredBy`, naming metrics that `evals/score.mjs` scores, and `test/skill-structure.sh` fails when a skill in the pack declares none or names a metric that does not exist. A skill without that mapping belongs in `skills/.experimental/`, which is documented rather than implied: `npx skills add` walks the repository to a depth of five and skips only `node_modules`, `.git`, `dist`, `build` and `__pycache__`, read from `skills@1.5.23`, so an experimental skill is still installed and the only marker that travels with it is its own description, which must open with `Experimental:`.

The gate also records what it cannot yet claim. `evals/run.sh` copies only `skills/product-engineer` into the work tree, so the other three skills are measured through the rules they share with it rather than on their own, and `release-notes` carries a `measuredGap` saying no task writes release notes at all. Naming that gap is the point of the declaration; a test that passed while the mapping was fiction would be worth nothing.

The customer block may be written in the language the team writes. `node bin/check.mjs check` on a message headed `Müşteri için:` reported `no "For the customer:" block` and exited 1, in a repository that ships plain-language tables in Turkish, Japanese and Chinese and therefore invites teams who do not write English. English, Turkish, Japanese and Chinese headings are now accepted with no configuration, a fullwidth colon reads as a colon, and `.product-engineer.json` names a heading for a language the table does not ship. The headings live in `skills/product-engineer/references/headings.md`, the commit-msg hook is generated from that table, and two tests fail if the table, the hook and the check drift apart.

The readability line refuses to score a script its formulas cannot read. A block written in Japanese returned `Flesch 0 (hard), LIX 0`, and so did Chinese, Korean, Arabic and Hebrew: a confident wrong number, on the languages whose plain-language tables this repository ships, from a skill whose fifth rule is that a number comes from a count. Flesch, Ateşman and LIX all count syllables or word lengths in an alphabet whose words are separated by spaces; for those scripts the check now says it is not scoring and why. English and Turkish output is unchanged.

A sentence ends at an ideographic full stop as well as a period, so the warning about a number without a method quotes one Japanese or Chinese sentence rather than the whole block, and counts them correctly. The Devanagari danda closes a sentence too. English splitting is unchanged, since none of those characters appear in it.

## 0.3.0 (2026-09-05)

- `references/from-the-diff.md`: derive the customer block from `git diff` rather than from memory of the request, including who the call path affects and what a reader would expect to be there and is not
- `check` warns when the customer block offers a passing test suite as its evidence and the message names no observation anywhere; describing tests that were added is not flagged
- Evals: the model is pinned, the requested model and the `claude --version` string are recorded in every `meta.json`, the runner prints the cost and does nothing without `--yes`, and a rerun writes to `evals/results-<timestamp>` instead of over the published evidence
- `node evals/score.mjs --failures` prints every failing cell with the evidence behind it; `RESULTS.md` publishes that list and a section on what eight tasks cannot prove
- `docs/case-study.md`: one real defect in a public repository, fixed twice by the same model on the same commit with the skill and without, both commit messages quoted whole, including where the two runs agreed and a cost pair that runs against the eight-task average
- `product-engineer doctor` lists the agents on this machine carrying the skill, in the project and in your home directory, and whether each copy still matches the packaged rules; it exits 1 when one is out of date
- `npm test` ran neither `test/release.test.mjs` nor `test/judge.test.mjs`; both run now, and `test/suite.test.mjs` fails when a test file is not named in the script

- A pack of four skills: `product-engineer` (the seven rules), `customer-block`,
  `done-means-observed` and `release-notes`, all placed by one `npx skills add`.
- Adapters generated from `SKILL.md` for Cursor, Copilot, Gemini, Cline, Kiro, Windsurf and
  `AGENTS.md`; CI refuses a commit where they differ.
- Rescored evaluation: the number heuristic ignores code, versions, issue numbers, years and
  hashes; documentation files count as documentation, not scope creep.
- README opens with the before/after and a demo of `check`; the install matrix moved to
  `docs/install.md`.
- `check` as integrations: a commitlint plugin and shareable config, a pre-commit hook, and
  lefthook and husky snippets.
- Eval harness v2: runs per arm, a seeded bootstrap interval on the mean per-task delta, a
  pairwise model judge that prints its cost before running, and the benchmark design.
- Reference files: press-release restatement, ship-show-ask, appetite, and a hansei line in
  the definition of done.
- Plain-language tables in Turkish, Japanese and Chinese.
- Readability of the customer block (Flesch or Ateşman, plus LIX) as an info line in `check`.
- Chinese README.
- `check --pr` reads the pull request through the GitHub API with the token Actions
  provides (gh stays the fallback), `--comment` leaves one comment on the pull request
  with the verdict and the block to paste, updated in place on later runs, and
  `--format github` turns errors and warnings into run annotations; the action uses all
  three, with `comment` and `token` inputs.
- The release command moves the `v0` tag to every release, so Actions pin
  `Bubblegunn/product-engineer@v0`; the README and the install page use it. The release workflow starts on full version tags only, so the moving tag cannot start a second publish.
- A Cursor rule file to copy, `examples/cursor/`, generated with the other adapters, and
  `docs/cursor.md` on the rule versus the skill.

## 0.1.0 (2026-09-05)

First release: the seven rules, five reference files, optional commit-msg hook, Claude Code plugin manifests, skills.sh layout.
