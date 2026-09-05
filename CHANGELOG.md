# Changelog

## 0.3.0 (unreleased)

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
- A Cursor rule file to copy, `examples/cursor/`, generated with the other adapters, and
  `docs/cursor.md` on the rule versus the skill.

## 0.1.0 (2026-09-05)

First release: the seven rules, five reference files, optional commit-msg hook, Claude Code plugin manifests, skills.sh layout.
