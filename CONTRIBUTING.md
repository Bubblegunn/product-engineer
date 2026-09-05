# Contributing

Thank you for reading this far. The skill is short on purpose, so every change to it is
visible. Three kinds of contribution are welcome.

## Propose a rule change

Open an issue with the "Rule proposal" template. One before/after pair is required: show
what an agent writes today and what it would write under your rule, on a realistic task.
A rule that cannot be shown in a before/after is not ready.

A new rule, or a change to one, ships with an eval task under `evals/tasks/` and a
before/after pair in `references/`; a reference-only change needs the pair.

Changes to `skills/product-engineer/SKILL.md` keep it under 120 lines. Long material goes
into `references/`.

## Fix or extend a reference file

`references/plain-language.md`, `references/commit-template.md`, `references/five-questions.md`,
`references/definition-of-done.md` and `references/not-shipped.md` take pull requests directly.
Keep the tone: plain sentences, no jargon left unexplained, no em dashes.

## Translate

A `README.<lang>.md` next to `README.md`, and, if you want, a `plain-language.<lang>.md` in
`references/`. Keep the code blocks and the before/after examples in English so they match
what agents actually emit. Add your language to the language line at the top of `README.md`.

## Before you push

```
npm test
```

That runs the structure script, the hook test, the check, adapter, scorer, integration and
readability tests, and refuses generated adapters that disagree with `SKILL.md` (run
`node scripts/generate-adapters.mjs` after editing it). CI runs the same on Ubuntu and macOS.

## Commits

Every commit in this repository ends with the block the skill asks for:

```
For the customer:
What changed: ...
Why it matters: ...
```

`sh scripts/install-hook.sh` installs the hook that checks it. Merge, fixup and revert
commits pass without the block; `[no-customer]` in the message opts one commit out.

## Releasing

Maintainers only. One command; the workflow does the rest.

1. Write the `## X.Y.Z (unreleased)` entry in `CHANGELOG.md` and merge it.
2. On a clean, green `main`: `npm run release -- X.Y.Z` (or `patch`, `minor`, `major`; add `--dry-run` to see the plan). It dates the entry, sets the version in `package.json`, `CITATION.cff`, `.claude-plugin/plugin.json` and the pinned `uses:` line in the README, runs the tests, commits, tags `vX.Y.Z` and pushes.
3. Watch the `release` workflow: it publishes to npm with provenance, creates the GitHub release from the CHANGELOG entry, and installs the published version from the registry on three operating systems.

CI runs `scripts/release-gate.mjs` on every push: the version must agree across those files and `npm pack` may ship only the paths in `scripts/pack-allowlist.txt` (regenerate with `node scripts/release-gate.mjs --update` when the package layout changes on purpose).

The workflow uses npm trusted publishing and holds no token. Before the first tagged release the maintainer configures the trusted publisher on npmjs.com: package settings, Trusted publishing, GitHub Actions, repository `Bubblegunn/product-engineer`, workflow `release.yml`, "Allow npm publish" ticked.
