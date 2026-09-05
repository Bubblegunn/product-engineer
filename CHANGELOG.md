# Changelog

## 0.3.1 (unreleased)

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
